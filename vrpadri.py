from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def create_data_model():
    data = {}
    
    # 1. Input Parameters
    data['v_min'] = 15.0       # Minimum speed (e.g., km/h or m/s)
    data['v_avg'] = 30.0       # Average speed
    data['alpha_traffic'] = 1.2 # Traffic factor
    data['T_base'] = 10.0      # Base service/wait parameter
    data['gamma_risk'] = 0.25  # Risk level factor
    
    # Penalty Multipliers (must be integers for OR-Tools)
    data['J_penalty'] = 1      # Very small penalty for early arrival (Arrival < Tmax)
    data['Z_penalty'] = 1000   # Significant penalty for late arrival (Arrival > Tmax)

    # Base travel time matrix between nodes (0 is Depot)
    base_time_matrix = [
        [0, 10, 15, 20],
        [10, 0, 12, 18],
        [15, 12, 0, 10],
        [20, 18, 10, 0]
    ]

    num_nodes = len(base_time_matrix)
    
    # 2. Compute d[i][j] matrix and T_max for each node
    # d[i][j] = BaseTime * alphaTraffic * avg_speed
    data['d_matrix'] = [
        [int(base_time_matrix[i][j] * data['alpha_traffic'] * data['v_avg']) for j in range(num_nodes)]
        for i in range(num_nodes)
    ]
    
    # Calculate T_max for each location (i) relative to its distance from Depot (node 0)
    data['T_max'] = []
    for i in range(num_nodes):
        if i == 0:
            data['T_max'].append(1440) # Large shift horizon for depot
        else:
            d_i = data['d_matrix'][0][i]
            t_max_i = (d_i / data['v_min']) + (data['T_base'] / (1.0 + data['gamma_risk']))
            data['T_max'].append(int(round(t_max_i)))

    data['num_vehicles'] = 2
    data['depot'] = 0
    return data

def solve_custom_vrp():
    data = create_data_model()

    manager = pywrapcp.RoutingIndexManager(
        len(data['d_matrix']), 
        data['num_vehicles'], 
        data['depot']
    )
    routing = pywrapcp.RoutingModel(manager)

    # Transit Callback returning travel duration/distance d[i]
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['d_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    
    # Base route distance cost
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Time/Arrival Dimension
    time_dimension_name = 'Time'
    routing.AddDimension(
        transit_callback_index,
        1440,  # Max slack/waiting allowed
        1440,  # Max total horizon per vehicle
        False, # Force start at time 0
        time_dimension_name
    )
    time_dimension = routing.GetDimensionOrDie(time_dimension_name)

    # Set asymmetric soft target bounds for each node
    for node_idx in range(1, len(data['d_matrix'])):
        index = manager.NodeToIndex(node_idx)
        t_max = data['T_max'][node_idx]

        # 1. Early Arrival Penalty (Arrival < Tmax): J * (Tmax - Tarrival)
        # Built into OR-Tools via Slack / CumulVar linear cost coefficient
        time_dimension.SetCumulVarSoftLowerBound(index, t_max, data['J_penalty'])

        # 2. Late Arrival Penalty (Arrival > Tmax): Z * (Tarrival - Tmax)
        time_dimension.SetCumulVarSoftUpperBound(index, t_max, data['Z_penalty'])

    # Search Configuration
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        print_solution(data, manager, routing, solution, time_dimension)
    else:
        print("No feasible route found.")

def print_solution(data, manager, routing, solution, time_dimension):
    for vehicle_id in range(data['num_vehicles']):
        index = routing.Start(vehicle_id)
        plan_output = f"Route for Vehicle {vehicle_id}:\n"
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            arrival_time = solution.Min(time_var)
            t_max = data['T_max'][node]
            
            plan_output += f" Node {node} (Arrival: {arrival_time}, Tmax: {t_max}) ->"
            index = solution.Value(routing.NextVar(index))
            
        node = manager.IndexToNode(index)
        time_var = time_dimension.CumulVar(index)
        plan_output += f" Node {node} (Arrival: {solution.Min(time_var)})\n"
        print(plan_output)

if __name__ == '__main__':
    solve_custom_vrp()

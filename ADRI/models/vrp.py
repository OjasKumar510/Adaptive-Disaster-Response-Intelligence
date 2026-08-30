import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def solve_vrp_custom_score(
    adj_matrix, 
    V_avg, 
    traffic_score, 
    start_node, 
    gamma, 
    beta, 
    num_vehicles=1
):
    """
    Solves VRP with custom objective score penalties using Google OR-Tools.
    
    Parameters:
        adj_matrix (list or np.ndarray): Distance matrix (use float('inf') for missing edges).
        V_avg (float): Average velocity (units/time).
        traffic_score (float): Multiplier factor for edge distances.
        start_node (int): Index of starting depot node.
        gamma (float): Penalty coefficient for late arrivals (T_arrival > T_max).
        beta (float): Penalty coefficient for early arrivals (T_arrival < T_max).
        num_vehicles (int): Number of vehicles available.
    """
    adj_matrix = np.array(adj_matrix, dtype=float)
    num_nodes = len(adj_matrix)
    
    # Large integer to represent infinite/unreachable edges in OR-Tools
    INF_VAL = 10**9
    
    # 1. Calculate T_max for each node based on original unadjusted d0(i)
    # T_max(i) = d0(i) / V_avg
    t_max = {}
    for i in range(num_nodes):
        d0_i = adj_matrix[start_node][i]
        if d0_i == float('inf'):
            t_max[i] = INF_VAL
        else:
            t_max[i] = int(round(d0_i / V_avg))

    # 2. Adjust distance matrix based on traffic score
    # d(i) = d(i) * (1 + traffic_score)
    traffic_adj_matrix = np.zeros_like(adj_matrix)
    for i in range(num_nodes):
        for j in range(num_nodes):
            if adj_matrix[i][j] == float('inf'):
                traffic_adj_matrix[i][j] = INF_VAL
            else:
                traffic_adj_matrix[i][j] = int(round(adj_matrix[i][j] * (1.0 + traffic_score)))

    # 3. Create OR-Tools Routing Manager and Model
    manager = pywrapcp.RoutingIndexManager(
        num_nodes, num_vehicles, [start_node] * num_vehicles, [start_node] * num_vehicles
    )
    routing = pywrapcp.RoutingModel(manager)

    # 4. Define Distance Evaluator Callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(traffic_adj_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    
    # Base arc costs: Sum of traffic-adjusted edge weights sum(d(i))
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 5. Add Time Dimension (Time = Distance / V_avg)
    def time_callback(from_index, to_index):
        dist = distance_callback(from_index, to_index)
        return int(round(dist / V_avg))

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    horizon = INF_VAL
    routing.AddDimension(
        time_callback_index,
        horizon,  # Max waiting time capacity
        horizon,  # Maximum travel horizon
        False,    # Don't force start time to zero
        "Time"
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # 6. Apply Beta (Early) and Gamma (Late) Soft Penalties
    for node in range(num_nodes):
        if node == start_node:
            continue
        index = manager.NodeToIndex(node)
        target_time = t_max[node]
        
        if target_time < INF_VAL:
            # Penalty for late arrivals: Gamma * (T_arrival - T_max)
            time_dimension.SetCumulVarSoftUpperBound(index, target_time, int(round(gamma)))
            
            # Penalty for early arrivals: Beta * (T_max - T_arrival)
            time_dimension.SetCumulVarSoftLowerBound(index, target_time, int(round(beta)))

    # 7. Configure Optimization Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 5

    # 8. Solve Optimization
    solution = routing.SolveWithParameters(search_parameters)

    # 9. Format Results
    if solution:
        results = {"total_cost": solution.ObjectiveValue(), "routes": []}
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route = []
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                arrival_time = solution.Min(time_var)
                route.append({
                    "node": node,
                    "t_arrival": arrival_time,
                    "t_max": t_max[node]
                })
                index = solution.Value(routing.NextVar(index))
            
            # Add final depot return step
            node = manager.IndexToNode(index)
            route.append({
                "node": node, 
                "t_arrival": solution.Min(time_dimension.CumulVar(index)), 
                "t_max": t_max[node]
            })
            results["routes"].append(route)
        return results
    else:
        return None

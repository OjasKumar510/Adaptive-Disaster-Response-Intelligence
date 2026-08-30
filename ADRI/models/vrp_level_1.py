import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def solve_vrp_custom_score(
    adj_matrix, 
    R1, 
    R2, 
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
        R1, R2 (float): Reliability/route parameters.
        V_avg (float): Average velocity (units/time).
        traffic_score (float): Multiplier factor for edge distances.
        start_node (int): Index of starting depot node.
        gamma (float): Penalty coefficient for late arrivals (T_arrival > T_max).
        beta (float): Penalty coefficient for early arrivals (T_arrival < T_max).
        num_vehicles (int): Number of vehicles available.
    """
    adj_matrix = np.array(adj_matrix, dtype=float)
    num_nodes = len(adj_matrix)
    
    # Replace infinity with a large integer for routing feasibility
    INF_VAL = 10**9
    
    # 1. Calculate T_max for each node based on original unadjusted d0(i)
    # d0(i) is distance from start_node to node i
    t_max = {}
    time_factor = (1.0 + (2.0 / (R1 + R2))) / V_avg
    for i in range(num_nodes):
        d0_i = adj_matrix[start_node][i]
        if d0_i == float('inf'):
            t_max[i] = INF_VAL
        else:
            t_max[i] = int(round(d0_i * time_factor))

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
    
    # Base arc costs: Sum of adjusted d(i)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 5. Add Time Dimension (Time = Distance / V_avg)
    def time_callback(from_index, to_index):
        # Time required to travel between nodes
        dist = distance_callback(from_index, to_index)
        return int(round(dist / V_avg))

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    horizon = INF_VAL
    routing.AddDimension(
        time_callback_index,
        horizon,  # Allow waiting time
        horizon,  # Maximum travel capacity horizon
        False,    # Don't force start to zero
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
            # Penalty for arriving AFTER T_max (Gamma * (T_arrival - T_max))
            time_dimension.SetCumulVarSoftUpperBound(index, target_time, int(round(gamma)))
            
            # Penalty for arriving BEFORE T_max (Beta * (T_max - T_arrival))
            time_dimension.SetCumulVarSoftLowerBound(index, target_time, int(round(beta)))

    # 7. Configure Search Parameters
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
            
            # Add depot return node
            node = manager.IndexToNode(index)
            route.append({"node": node, "t_arrival": solution.Min(time_dimension.CumulVar(index)), "t_max": t_max[node]})
            results["routes"].append(route)
        return results
    else:
        return None

# =====================================================================
# EXAMPLE USAGE
# =====================================================================
if __name__ == "__main__":
    INF = float('inf')
    
    # 5-node adjacency matrix
    adjacency_matrix = [
        [0,   10,  15,  INF, 20],
        [10,  0,   35,  25,  INF],
        [15,  35,  0,   30,  5],
        [INF, 25,  30,  0,   15],
        [20,  INF, 5,   15,  0]
    ]

    R1 = 0.8
    R2 = 1.2
    V_avg = 5.0
    traffic_score = 0.2  # 20% traffic penalty
    start_node = 0
    gamma = 5.0          # Late arrival penalty factor
    beta = 2.0           # Early arrival penalty factor

    solution = solve_vrp_custom_score(
        adj_matrix=adjacency_matrix,
        R1=R1,
        R2=R2,
        V_avg=V_avg,
        traffic_score=traffic_score,
        start_node=start_node,
        gamma=gamma,
        beta=beta,
        num_vehicles=1
    )

    if solution:
        print(f"Optimal Score (Objective): {solution['total_cost']}")
        for i, route in enumerate(solution['routes']):
            print(f"\nRoute for Vehicle {i+1}:")
            for step in route:
                print(f" Node {step['node']} | Arrival Time: {step['t_arrival']} | Target T_max: {step['t_max']}")
    else:
        print("No feasible route found.")
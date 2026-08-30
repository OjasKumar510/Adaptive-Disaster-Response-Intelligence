"""
ADRI - Road Blockage Detection Module

Input:
    model_path : path to trained YOLO 3 model
    image_path : path to input road/drone image

Output:
    Dictionary containing:
        - road_blocked
        - blockage_causes
        - confidence
"""

from ultralytics import YOLO


# ============================================================
# BLOCKAGE CLASSES
# ============================================================

BLOCKAGE_CLASSES = {
    "road_debris",
    "fallen_tree"
}


# ============================================================
# ROAD BLOCKAGE DETECTION
# ============================================================

def get_road_blockage_status(model_path, image_path):
    """
    Run YOLO 3 on an input image and determine
    whether the road is blocked.

    Parameters
    ----------
    model_path : str
        Path to the trained YOLO 3 model.

    image_path : str
        Path to the input road/drone image.

    Returns
    -------
    dict
        Road blockage information.
    """

    # Load trained YOLO model
    model = YOLO(model_path)

    # Run detection
    results = model.predict(
        source=image_path,
        verbose=False
    )

    result = results[0]

    detected_blockages = []

    # Process detected objects
    for box in result.boxes:

        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = result.names[class_id]

        # Check whether detection is a blockage
        if class_name in BLOCKAGE_CLASSES:

            detected_blockages.append({
                "cause": class_name,
                "confidence": confidence
            })

    # ========================================================
    # NO BLOCKAGE DETECTED
    # ========================================================

    if not detected_blockages:

        return {
            "road_blocked": False,
            "blockage_causes": [],
            "confidence": 0.0
        }

    # ========================================================
    # BLOCKAGE DETECTED
    # ========================================================

    # Get unique blockage causes
    blockage_causes = list({
        detection["cause"]
        for detection in detected_blockages
    })

    # Highest confidence among detected blockages
    confidence = max(
        detection["confidence"]
        for detection in detected_blockages
    )

    return {
        "road_blocked": True,
        "blockage_causes": blockage_causes,
        "confidence": round(confidence, 4)
    }

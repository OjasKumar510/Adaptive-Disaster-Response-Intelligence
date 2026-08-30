import cv2
import numpy as np
from ultralytics import YOLO

def estimate_survival_probability(thermal_crop):
    """
    Estimates survival probability from a thermal crop.
    
    In standard grayscale thermal images (White-Hot/Ironbow converted to 1-channel):
    - Higher pixel intensities represent higher temperatures (body heat).
    - Living humans usually show distinct warm core areas (~36.5°C - 37.5°C).
    
    Adjust thresholds according to your sensor's temperature mapping.
    """
    if thermal_crop.size == 0:
        return 0.0

    # Convert to grayscale if it's 3-channel
    if len(thermal_crop.shape) == 3:
        thermal_gray = cv2.cvtColor(thermal_crop, cv2.COLOR_BGR2GRAY)
    else:
        thermal_gray = thermal_crop

    # Example Heuristic: Evaluate mean heat and top percentile heat signature
    mean_heat = np.mean(thermal_gray)
    peak_heat = np.percentile(thermal_gray, 90) # Top 10% hottest pixels in bounding box

    # Normalize values (assuming 0-255 scale) to a 0.0 - 1.0 probability range
    # Adjust 'heat_threshold' based on your calibrated thermal camera scale
    heat_threshold = 120.0  # Pixel value boundary for normal body warmth
    
    # Sigmoid mapping for smooth probability transition
    score = (peak_heat - heat_threshold) / 20.0
    survival_prob = 1.0 / (1.0 + np.exp(-score))
    
    return float(np.clip(survival_prob, 0.0, 1.0))


def process_risk_zone(rgb_path, thermal_path, model_path, person_class_id=0):
    # 1. Load Model and Images
    model = YOLO(model_path)
    rgb_img = cv2.imread(rgb_path)
    thermal_img = cv2.imread(thermal_path)

    # Verify image dimensions match
    if rgb_img.shape[:2] != thermal_img.shape[:2]:
        # Resize thermal image to match RGB spatial resolution if needed
        thermal_img = cv2.resize(thermal_img, (rgb_img.shape[1], rgb_img.shape[0]))

    # 2. Run YOLO Detection on RGB Image
    results = model.predict(source=rgb_img, conf=0.3)
    
    person_results = []
    total_alive_probability = 0.0

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            
            # Filter detections to target class (usually class_id 0 = person in COCO)
            if cls_id == person_class_id:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                detection_conf = float(box.conf[0])

                # 3. Crop corresponding region from Thermal Image
                thermal_crop = thermal_img[y1:y2, x1:x2]

                # 4. Calculate Survival Probability
                p_alive = estimate_survival_probability(thermal_crop)
                total_alive_probability += p_alive

                person_results.append({
                    "bbox": [x1, y1, x2, y2],
                    "yolo_conf": detection_conf,
                    "survival_probability": p_alive,
                    "status": "Alive" if p_alive >= 0.5 else "Unresponsive/Dead"
                })

    total_persons = len(person_results)

    # 5. Calculate Risk Zone Score
    # Risk Score increases as the density of living survivors in the zone increases.
    # Uses a saturating function (0.0 to 100.0) based on expected rescue urgency.
    if total_persons > 0:
        avg_survival_rate = total_alive_probability / total_persons
        # Risk scales with both the number of living people and their likelihood of survival
        risk_score = min(100.0, (total_alive_probability * 15.0) * avg_survival_rate)
    else:
        avg_survival_rate = 0.0
        risk_score = 0.0

    return {
        "total_persons_detected": total_persons,
        "total_alive_equivalent": round(total_alive_probability, 2),
        "risk_zone_score": round(risk_score, 2),
        "detections": person_results
    }


# --- Execution Example ---
if __name__ == "__main__":
    RGB_PATH = "path/to/rgb_image.jpg"
    THERMAL_PATH = "path/to/thermal_image.jpg"
    MODEL_PATH = r"ADRI/models/yolo model 4.pt"

    analysis = process_risk_zone(RGB_PATH, THERMAL_PATH, MODEL_PATH)

    print(f"Total Detected: {analysis['total_persons_detected']}")
    print(f"Estimated Living Count: {analysis['total_alive_equivalent']}")
    print(f"Risk Zone Score (0-100): {analysis['risk_zone_score']}")
    
    print("\nIndividual Detections:")
    for i, det in enumerate(analysis['detections']):
        print(f" Person {i+1}: BBox={det['bbox']} | Survival Prob={det['survival_probability']:.2f} | Status={det['status']}")
# --- Usage Example ---
""""
for idx, item in enumerate(cropped_matrices):
    print(f"Crop {idx + 1}: {item['class_name']} | Shape: {item['shape']}")
    
    # Save the individual crop matrix to disk using OpenCV
    cv2.imwrite(f"crop_{idx}_{item['class_name']}.jpg", item['matrix'])
"""
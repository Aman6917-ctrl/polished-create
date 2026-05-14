"""One-off generator: writes processed_data/metadata/final_metadata.csv from ADNI slice table."""
from __future__ import annotations

import csv
from pathlib import Path

# (img_start, img_end_inclusive, image_id, subject_id, diagnosis, age, sex)
BLOCKS: list[tuple[int, int, str, str, str, int, str]] = [
    (0, 19, "I40657", "002_S_0413", "CN", 76, "F"),
    (20, 39, "I64551", "002_S_0413", "CN", 77, "F"),
    (40, 59, "I120746", "002_S_0413", "CN", 79, "F"),
    (60, 79, "I118675", "002_S_0413", "CN", 76, "F"),
    (80, 99, "I128346", "002_S_0413", "CN", 77, "F"),
    (100, 119, "I82102", "002_S_0559", "CN", 81, "M"),
    (120, 139, "I45126", "002_S_0559", "CN", 79, "M"),
    (140, 159, "I79123", "002_S_0559", "CN", 80, "M"),
    (160, 179, "I120779", "002_S_0559", "CN", 82, "M"),
    (180, 199, "I118679", "002_S_0559", "CN", 79, "M"),
    (200, 219, "I40828", "002_S_1018", "AD", 71, "F"),
    (220, 239, "I64750", "002_S_1018", "AD", 71, "F"),
    (240, 259, "I97022", "002_S_1018", "AD", 72, "F"),
    (260, 279, "I132795", "002_S_1018", "AD", 73, "F"),
    (280, 299, "I60050", "002_S_1070", "MCI", 74, "M"),
    (300, 319, "I40840", "002_S_1070", "MCI", 74, "M"),
    (320, 339, "I86231", "002_S_1070", "MCI", 75, "M"),
    (340, 359, "I120784", "002_S_1070", "MCI", 75, "M"),
    (360, 379, "I132215", "002_S_1070", "MCI", 76, "M"),
    (380, 392, "I65561", "002_S_1261", "CN", 71, "F"),
]

SOURCE = "ADNI1_Complete 2Yr 3T"


def main() -> None:
    repo = Path(__file__).resolve().parent.parent.parent
    out = repo / "processed_data" / "metadata" / "final_metadata.csv"
    out.parent.mkdir(parents=True, exist_ok=True)

    fields = ["image_name", "image_id", "subject_id", "diagnosis", "age", "sex", "source_folder"]
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for lo, hi, iid, subj, diag, age, sex in BLOCKS:
            for idx in range(lo, hi + 1):
                w.writerow(
                    {
                        "image_name": f"img_{idx}.png",
                        "image_id": iid,
                        "subject_id": subj,
                        "diagnosis": diag,
                        "age": age,
                        "sex": sex,
                        "source_folder": SOURCE,
                    }
                )

    n = sum(hi - lo + 1 for lo, hi, *_ in BLOCKS)
    print("Wrote", n, "rows to", out)


if __name__ == "__main__":
    main()

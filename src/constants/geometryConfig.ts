/* Auto-generated from stairs-geometry-config.json. Do not edit directly. */
export const GEOMETRY_CONFIG = {
  "version": 1,
  "units": "cm",
  "dimensions": {
    "stairWidthCm": 80,
    "topFloorRiseCm": 289,
    "ceilingRiseCm": 215,
    "holeWidthCm": 233,
    "topWallLenCm": 50,
    "topWallDropCm": 45,
    "podestLenCm": 80,
    "leftToCeilingEndCm": 70,
    "leftWallSegmentLenCm": 60,
    "leftWallSegmentHeightCm": 90,
    "leftWallTowerHeightCm": 250,
    "leftWallTowerThicknessCm": 20,
    "tallWallHeightCm": 300,
    "tallWallThicknessCm": 25,
    "slabThicknessCm": 35,
    "soilThicknessCm": 40,
    "soilExpandZCm": 35,
    "soilSideGapCm": 4,
    "sideWallThicknessCm": 20,
    "leftSideWallThicknessCm": 20,
    "concreteGapToWallCm": 30,
    "innerVolumeInsetCm": 2
  },
  "materials": {
    "sceneBackground": 16316145,
    "floor": 15196632,
    "gridMajor": 9408399,
    "gridMinor": 13222230,
    "stairRight": 30932,
    "stairLeft": 11673417,
    "stairEdge": 8329014,
    "concrete": 9142680,
    "concreteOpacity": 0.6,
    "wall": 14670385,
    "slab": 14144202,
    "soil": 11180415,
    "transparentWall": 2989199,
    "transparentWallOpacity": 0.35,
    "headspace": 5224150,
    "headspaceOpacity": 0.22,
    "levelGuide": {
      "color": 12947245,
      "emissive": 7027984,
      "emissiveIntensity": 0.25
    }
  },
  "visibility": {
    "showLeftSideWall": false,
    "showPodestGuides": false
  },
  "entities": [
    {
      "id": "left_wall_profile",
      "type": "wall",
      "pins": {
        "outer_left_x": "x-min",
        "ceiling_edge_x": "x-max",
        "top_y": "y-max"
      }
    },
    {
      "id": "side_wall_right",
      "type": "wall-transparent",
      "pins": {
        "start_x": "x-min",
        "end_x": "x-max",
        "inner_face_z": "z-max"
      }
    },
    {
      "id": "side_wall_left",
      "type": "wall-transparent",
      "pins": {
        "start_x": "x-min",
        "end_x": "x-max",
        "outer_face_z": "z-max"
      }
    },
    {
      "id": "tall_wall",
      "type": "wall",
      "pins": {
        "left_face_x": "x-min",
        "right_face_x": "x-max",
        "top_y": "y-max"
      }
    },
    {
      "id": "slab_main",
      "type": "slab",
      "pins": {
        "top_y": "y-max",
        "bottom_y": "y-min"
      }
    },
    {
      "id": "soil_main",
      "type": "soil",
      "pins": {
        "top_y": "y-max",
        "bottom_y": "y-min"
      }
    }
  ],
  "connections": [
    {
      "from": "left_wall_profile.outer_left_x",
      "to": "side_wall_left.start_x",
      "kind": "x-span-anchor"
    },
    {
      "from": "tall_wall.left_face_x",
      "to": "side_wall_left.end_x",
      "kind": "x-span-anchor"
    },
    {
      "from": "left_wall_profile.ceiling_edge_x",
      "to": "side_wall_right.start_x",
      "kind": "x-span-anchor"
    },
    {
      "from": "slab_main.top_y",
      "to": "soil_main.bottom_y",
      "kind": "vertical-contact"
    },
    {
      "from": "soil_main.top_y",
      "to": "headspace.cap_y",
      "kind": "clearance-cap"
    }
  ]
} as const;

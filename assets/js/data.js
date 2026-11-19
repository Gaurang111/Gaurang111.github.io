/* Site content. Edit here; index.html and project.html render from it.
   media: { type: "image" | "video" | "youtube", src, poster?, caption, contain? } */
window.SITE = {
  github: "https://github.com/Gaurang111",
  linkedin: "https://www.linkedin.com/in/gaurangsolanki111/",
  medium: "https://medium.com/@gorangsolanki111",
  email: "gorangsolanki111@gmail.com",
};

window.CATEGORIES = {
  vision: "Computer Vision",
  agents: "Agentic AI",
  physical: "Physical AI",
  research: "ML Research",
};

window.PROJECTS = [
  {
    id: "dreampick",
    title: "DreamPick",
    tagline: "A real robot arm picks up a cube using a plan it only ever practised in simulation.",
    year: "2026",
    status: "Shipped",
    cats: ["physical", "vision"],
    thumb: "assets/img/projects/dreampick/layout.jpg",
    hero: { type: "video", src: "assets/img/projects/dreampick/demo.mp4", poster: "assets/img/projects/dreampick/layout.jpg" },
    links: [{ label: "Source on GitHub", url: "https://github.com/Gaurang111/DreamPick" }],
    stack: ["PyTorch", "DreamerV3", "MuJoCo", "Gymnasium", "OpenCV", "LeRobot", "SO-101"],
    metrics: [
      { value: "84%", label: "pick success in a noisy simulator" },
      { value: "5M+", label: "simulated steps of training" },
      { value: "~170 h", label: "on one 8 GB laptop GPU" },
      { value: "0", label: "training steps on the real robot" },
    ],
    summary:
      "An overhead webcam finds a cube on my desk. A MuJoCo twin of the desk gets the same cube, a DreamerV3-style world model plans the whole pick inside the simulator, and a 3D-printed SO-101 arm replays the joint path on the real table.",
    sections: [
      {
        h: "Why it is hard",
        p: [
          "Robots can practise millions of times in simulation for free, but the jump from sim to real is where most projects fall apart: servo lag, joints that sag under gravity, and a camera that loses the object the moment the gripper covers it.",
          "The goal was to take a low-cost, open-source arm and get a real pick out of a policy that never saw the real robot during training.",
        ],
      },
      {
        h: "How it works",
        steps: [
          ["Real to sim", "The webcam detects the cube and measures x, y and yaw. A camera-to-arm map, fitted once using the arm itself as the ruler, drops the cube into the simulator's frame."],
          ["World model plans", "The policy reads six joint angles and the cube pose, imagines the next moments in a learned latent space and picks the moves that end with the cube in the gripper. It runs closed loop at 20 Hz in the twin."],
          ["Sim to real", "A servo bridge converts sim angles to servo ticks, clamps them to the real arm's usable ranges and leads the commands to cover about 0.2 s of servo lag."],
        ],
      },
      {
        h: "Three training runs, two failures",
        p: [
          "Run 1 learned from camera images. It could reach and grab but never lift: the simulated gripper's collision shapes could not hold the cube, and the reward had a loophole (drag the cube toward the base).",
          "Run 2 fixed those and lifted the cube about 96% of the time in simulation, then missed on the real arm. A good score in simulation is not a good score on the desk.",
          "Run 3 dropped the images in favour of joint state plus a clean cube pose, trained through a six-stage curriculum with fixed-seed pass/fail gates, and picked a real cube.",
        ],
      },
      {
        h: "What I learned",
        list: [
          "A model finds the cheapest way to score. A height-only lift reward taught the arm to drag the cube across the table.",
          "Extra inputs can hurt. A “cube is hidden” flag made training collapse until I removed it.",
          "Select checkpoints on fixed-seed success, not on the training score.",
          "Real hardware has its own physics. Model the lag, sag and occlusion, or the sim will lie to you.",
        ],
      },
    ],
    gallery: [
      { type: "video", src: "assets/img/projects/dreampick/sim-to-real.mp4", poster: "assets/img/projects/dreampick/sim-to-real.jpg", caption: "Top camera on the real desk next to the simulated plan, synced in time." },
      { type: "image", src: "assets/img/projects/dreampick/poster.jpg", caption: "Camera, world model and real arm side by side." },
      { type: "image", src: "assets/img/projects/dreampick/pipeline.svg", caption: "One pick, end to end.", contain: true },
      { type: "image", src: "assets/img/projects/dreampick/journey.svg", caption: "Three training runs and what changed between them.", contain: true },
      { type: "video", src: "assets/img/projects/dreampick/dream.mp4", poster: "assets/img/projects/dreampick/dream.jpg", caption: "Run 1: what the world model reconstructs versus what it dreams.", contain: true },
      { type: "image", src: "assets/img/projects/dreampick/learning-curves.jpg", caption: "Run 1 learning curves across reach, grasp and lift.", contain: true },
      { type: "image", src: "assets/img/projects/dreampick/camera-views.jpg", caption: "Choosing camera placement from what a 64 px observation can actually see.", contain: true },
      { type: "image", src: "assets/img/projects/dreampick/sim-pose.jpg", caption: "Calibrating the simulated twin against the real arm's pose.", contain: true },
    ],
  },

  {
    id: "tictactoe-vla",
    title: "Tic-Tac-Toe VLA",
    tagline: "Teaching a real SO-101 arm to play tic-tac-toe by fine-tuning a Vision-Language-Action model.",
    year: "2026",
    status: "In progress",
    cats: ["physical", "vision"],
    thumb: "assets/img/projects/tictactoe-vla/cover.svg",
    hero: { type: "image", src: "assets/img/projects/tictactoe-vla/cover.svg" },
    links: [],
    stack: ["SmolVLA", "LeRobot", "PyTorch", "OpenCV", "Minimax", "SO-101"],
    metrics: [
      { value: "18", label: "language-conditioned placement tasks" },
      { value: "~450M", label: "parameter VLA on an 8 GB GPU" },
      { value: "9", label: "cells, each evaluated on the real arm" },
    ],
    summary:
      "The next step after DreamPick: instead of a state-based policy trained in simulation, a VLA model learns directly from teleoperated demonstrations on the real arm and follows instructions like “place the X piece in the top-left cell”.",
    sections: [
      {
        h: "The design",
        p: [
          "The problem is split so each part does what it is good at. A camera and simple vision read the board, and minimax (tic-tac-toe is solved) chooses the cell. The VLA only has to master the motor skill: pick a piece and place it precisely in one of nine cells.",
        ],
        steps: [
          ["Read the board", "Crop the board from the overhead image and classify every cell as empty, X or O by colour."],
          ["Choose the move", "Minimax picks the best cell and turns it into a language instruction."],
          ["Act", "SmolVLA, fine-tuned with LeRobot, takes camera images, joint state and the instruction and outputs action chunks."],
          ["Verify", "Re-read the board to confirm the placement, retry or ask for help if it disagrees."],
        ],
      },
      {
        h: "Plan",
        list: [
          "Record 30–50 teleoperated demonstrations per cell with a leader arm, in LeRobot dataset format.",
          "Fine-tune from smolvla_base with bf16, small batches and gradient accumulation to fit 8 GB of VRAM.",
          "Evaluate success per cell on the real arm, 10 trials each.",
          "Stretch: let the VLA read the board and choose the move itself, then compare it with the minimax version.",
        ],
      },
    ],
    gallery: [],
  },

];

window.ARCHIVE = [
  { title: "OpenAtlas", year: "2026", tags: "MediaPipe · OpenCV · Hand tracking", img: "assets/img/projects/openatlas/demo.jpg", url: "https://github.com/Gaurang111/openatlas" },
  { title: "Local RAG, no framework", year: "2025", tags: "RAG · ChromaDB · Llama 3.2", img: "assets/img/projects/rag/cover.jpg", url: "https://github.com/Gaurang111/RAGwithLlama" },
  { title: "GraphOracle", year: "2026", tags: "GNNs · PyTorch Geometric", img: "assets/img/projects/graphoracle/cover.svg", url: "https://github.com/Gaurang111/graphoracle" },
  { title: "Queens Solver", year: "2026", tags: "OpenCV · Backtracking", img: "assets/img/projects/queens/pipeline.jpg", url: "https://github.com/Gaurang111/QueensSolver" },
  { title: "ScanSplit", year: "2023", tags: "OCR · AWS", img: "assets/img/archive/scansplit.jpg", url: "https://github.com/Gaurang111/cloudexpense" },
  { title: "Vegetable Classification", year: "2022", tags: "MobileNet · CNN", img: "assets/img/archive/vegetable-classification.jpg", url: "https://github.com/Gaurang111/Vegetable-Classification" },
  { title: "Dog Vision", year: "2021", tags: "MobileNetV2 · 120 breeds", img: "assets/img/archive/dog-vision.jpg", url: "https://github.com/Gaurang111/Dog-Vision" },
  { title: "Car Recognizer", year: "2021", tags: "TensorFlow · 196 classes", img: "assets/img/archive/car-recognizer.jpg", url: "https://github.com/Gaurang111/Car-Recognizer" },
];

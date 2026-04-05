# RubixCube: A High-Performance 3D Simulation & Systems Engineering Project

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

##  Executive Summary
**RubixCube** is a full-stack, browser-based 3D Rubik's Cube environment featuring a sophisticated automated solver. While the project originated from an interest in 3D graphics and UI/UX design, it evolved into a deep exploration of **Group Theory**, **Graph Search Algorithms**, and **Computational Optimization**.

The result is a production-ready application capable of solving any valid cube state in **under 500ms** using a custom implementation of the **Thistlethwaite Algorithm**.

---

##  The "Why" (Inspiration & Intent)
The project was sparked by a viral technical demonstration of 3D rendering within a web browser. Intrigued by the intersection of mathematics and visual art, I leveraged **Three.js** to build a functional cube.

As a non-cuber in the physical world, I recognized a unique opportunity: to bridge the gap between my manual inability to solve the puzzle and my technical ability to engineer a solution. This project served as a playground to apply **Competitive Programming** techniques—such as **IDA* search** and **bitmasking**—to a complex, real-world spatial problem.

---

##  Technical Architecture & Key Features

### 1. 3D Graphics & Interaction Engine
* **Technology:** Built with **React-Three.js**.
* **Live Synchronization:** Implemented a "Ref-based" state synchronization system to bypass React’s asynchronous render cycle, ensuring 60fps visual updates during complex face-turn sequences.
* **UX/UI:** Developed a mobile-responsive interface with hybrid input support (Keyboard shortcuts + Touch/Drag controls).

### 2. Algorithmic Solver (Thistlethwaite Implementation)
* **Strategy:** Utilizes a 4-phase state-space reduction method, narrowing the cube's $4.3 \times 10^{19}$ combinations down to a solved state.
* **Optimization:**
    * **IDA* Search:** Employs Iterative Deepening A* for efficient pathfinding.
    * **Joint BFS Pruning Tables:** Engineered an 8MB pre-computed lookup table for the final "Half-Turn" phase, providing exact heuristics for 663,552 states.
    * **Typed Arrays:** Utilized `Int16Array` for memory-efficient data storage, significantly reducing Garbage Collection overhead during high-depth searches.

---

##  Engineering Challenges

### **The "Parity Paradox" & Orbit Separation**
* **The Problem:** Early iterations of the solver frequently hit "Infinite Search" traps.
* **The Insight:** Identified that simply having "Even Parity" across the whole cube wasn't enough; individual edge orbits (Top, Bottom, and Middle) required independent parity checks to be solvable by half-turns.
* **The Resolution:** Implemented a strict **Orbit Validation** layer in the logic controller, ensuring Phase 3 only hands off "mathematically legal" states to Phase 4.

### **Computational Bottlenecks**
* **The Problem:** Kociemba-style 2-phase solvers were too resource-intensive for the browser’s main thread, causing UI freezes.
* **The Resolution:** Pivot to the **Thistlethwaite Algorithm**. By breaking the search into four smaller, bounded sub-problems, the solver achieved predictable, sub-100ms execution times without sacrificing solution quality.

### **Continuous Integration & Deployment (CI/CD)**
* **The Problem:** Discrepancies between Windows-based development and Linux-based Vercel deployment led to build-time failures.
* **The Resolution:** Standardized the build pipeline to include automated generation of pruning tables during the `npm run build` step, ensuring environment parity.

---

##  Lessons Learned
* **Math > Brute Force:** Complex problems are often solved more efficiently by understanding the underlying mathematical constraints (Group Theory) than by adding more compute power.
* **Immutability is Scalable:** Transitioning to immutable state transformations in the cube logic eliminated 90% of state-corruption bugs.
* **User-Centric Design:** Even the most powerful algorithm is useless without an intuitive interface. Implementing "Hints" and "Solve Plans" transformed a raw math tool into an educational experience.

---

##  How to Deploy Locally
1.  **Clone:** `git clone https://github.com/noobifyLol/rubix_cube_project`
2.  **Install:** `npm install`
3.  **Run:** `npm run dev`
4.  **Build:** `npm run build` *(This generates the critical pruning tables)*.

5.  **Easiest** used the Vercel uplink : **https://rubix-cube-project-zeta.vercel.app/**.

---

**Project Version:** 1.0  
**Developer:** Prince  
**Status:** Successfully deployed and optimized.

/**
 * ============================================================================
 * AI BLOCKS WORLD SIMULATOR - STATE MANIPULATION & KINEMATICS ENGINE
 * ============================================================================
 */

// Global Configuration Variables
const BLOCK_WIDTH = 44;
const BLOCK_HEIGHT = 44;
const TABLE_BOTTOM_OFFSET = 35; // Matches table padding height in CSS

// Structural Layout Slot Coordinates (X axis offsets on the map)
// We now use 9 distinct slots to ensure EVERY block has its own space on the floor.
const SLOTS_X = [50, 120, 190, 260, 330, 400, 470, 540, 610];

/**
 * FOOLPROOF STRIPS PLANNER SEQUENCE (16 Steps)
 * Phase 1: Completely dismantle the initial tower. Every block gets its own table slot. Slot 0 becomes entirely empty.
 * Phase 2: Rebuild perfectly. Block A goes to the floor, B on A, C on B... H on G.
 */
const PLAN_STEPS = [
    // Phase 1: Unstack everything to separate slots on the table floor
    { block: 'A', fromSlot: 0, toSlot: 1, text: "Unstacking Block A -> Moving to Table Slot 1" },
    { block: 'H', fromSlot: 0, toSlot: 2, text: "Unstacking Block H -> Moving to Table Slot 2" },
    { block: 'G', fromSlot: 0, toSlot: 3, text: "Unstacking Block G -> Moving to Table Slot 3" },
    { block: 'F', fromSlot: 0, toSlot: 4, text: "Unstacking Block F -> Moving to Table Slot 4" },
    { block: 'E', fromSlot: 0, toSlot: 5, text: "Unstacking Block E -> Moving to Table Slot 5" },
    { block: 'D', fromSlot: 0, toSlot: 6, text: "Unstacking Block D -> Moving to Table Slot 6" },
    { block: 'C', fromSlot: 0, toSlot: 7, text: "Unstacking Block C -> Moving to Table Slot 7" },
    { block: 'B', fromSlot: 0, toSlot: 8, text: "Unstacking Block B -> Moving to Table Slot 8 (Slot 0 is now EMPTY)" },
    
    // Phase 2: Rebuild the tower flawlessly from the ground up
    { block: 'A', fromSlot: 1, toSlot: 0, text: "Placing Block A directly onto the empty floor of Slot 0" },
    { block: 'B', fromSlot: 8, toSlot: 0, text: "Stacking Block B on top of Block A" },
    { block: 'C', fromSlot: 7, toSlot: 0, text: "Stacking Block C on top of Block B" },
    { block: 'D', fromSlot: 6, toSlot: 0, text: "Stacking Block D on top of Block C" },
    { block: 'E', fromSlot: 5, toSlot: 0, text: "Stacking Block E on top of Block D" },
    { block: 'F', fromSlot: 4, toSlot: 0, text: "Stacking Block F on top of Block E" },
    { block: 'G', fromSlot: 3, toSlot: 0, text: "Stacking Block G on top of Block F" },
    { block: 'H', fromSlot: 2, toSlot: 0, text: "Goal State Reached! Stacking Final Block H on top of Block G" }
];

// Reactive Tracking States
let currentStepIndex = -1; 
let isPlaying = false;
let animationTimeout = null;

// Dynamic Virtual Stack Heights Tracking Multi-dimensional Arrays (Now supports 9 slots)
let trackingStacks = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
};

// UI Element References Hooking
const blocksContainer = document.getElementById('blocksContainer');
const robotArm = document.getElementById('robotArm');
const armBeam = document.querySelector('.arm-beam');
const gripper = document.getElementById('gripper');
const stepCounter = document.getElementById('stepCounter');
const actionLog = document.getElementById('actionLog');

const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnReset = document.getElementById('btnReset');

/**
 * Initializes DOM elements and positions them into Initial State layout configuration.
 */
function initializeSimulation() {
    blocksContainer.innerHTML = '';
    
    // Clear out stack matrix grids
    for (let slot in trackingStacks) {
        trackingStacks[slot] = [];
    }

    // Populate Initial State Stack into Slot 0: B is at bottom (index 0), A is at top (index 7)
    const initialOrder = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'A'];
    trackingStacks[0] = [...initialOrder];

    // Render Blocks elements into DOM
    initialOrder.forEach((blockId) => {
        const blockEl = document.createElement('div');
        blockEl.className = 'block';
        blockEl.id = `block-${blockId}`;
        blockEl.innerText = blockId;
        blocksContainer.appendChild(blockEl);
    });

    currentStepIndex = -1;
    isPlaying = false;
    clearTimeout(animationTimeout);
    
    updateUIControls();
    renderBlockPositions();
    resetRobotArmPosition();

    actionLog.innerText = "SYSTEM REBOOTED. INITIAL STATE READY.";
    stepCounter.innerText = `00 / ${PLAN_STEPS.length}`;
}

/**
 * Renders spatial coordinate transformation placements for tracking arrays updates
 */
function renderBlockPositions() {
    for (let slot in trackingStacks) {
        trackingStacks[slot].forEach((blockId, heightIndex) => {
            const blockEl = document.getElementById(`block-${blockId}`);
            if (blockEl) {
                const posX = SLOTS_X[slot];
                const posY = TABLE_BOTTOM_OFFSET + (heightIndex * BLOCK_HEIGHT);
                
                blockEl.style.left = `${posX}px`;
                blockEl.style.bottom = `${posY}px`;
            }
        });
    }
}

/**
 * Parks the Robotic Manipulator Structure to Default Home Coordinates
 */
function resetRobotArmPosition() {
    armBeam.style.left = '30px';
    armBeam.style.height = '60px';
    gripper.style.left = '12px';
    gripper.style.top = '75px';
}

/**
 * Core Path Kinematics Animation Logic Pipeline Engine
 */
function animateMove(blockId, fromSlot, toSlot, callback = () => {}) {
    const blockEl = document.getElementById(`block-${blockId}`);
    if (!blockEl) return callback();

    // Determine spatial geometry profiles before removing block from track model arrays
    const fromHeightIndex = trackingStacks[fromSlot].indexOf(blockId);
    const targetHeightIndex = trackingStacks[toSlot].length;

    const startX = SLOTS_X[fromSlot];
    const startY = TABLE_BOTTOM_OFFSET + (fromHeightIndex * BLOCK_HEIGHT);
    const endX = SLOTS_X[toSlot];
    const endY = TABLE_BOTTOM_OFFSET + (targetHeightIndex * BLOCK_HEIGHT);

    const stageHeight = document.getElementById('stage').clientHeight;
    const safetyClearanceY = 40; // Upward overhead transit buffer clearance zone height

    // Stage 1: Robot Arm moves horizontally to target block position and lowers its beam
    setTimeout(() => {
        armBeam.style.left = `${startX + (BLOCK_WIDTH / 2)}px`;
        gripper.style.left = `${startX + (BLOCK_WIDTH / 2) - 18}px`;
        
        const grabDepth = stageHeight - startY - BLOCK_HEIGHT - 15;
        armBeam.style.height = `${grabDepth}px`;
        gripper.style.top = `${grabDepth + 15}px`;
    }, 50);

    // Stage 2: Lift Block Upward vertically
    setTimeout(() => {
        const liftDepth = safetyClearanceY;
        armBeam.style.height = `${liftDepth}px`;
        gripper.style.top = `${liftDepth + 15}px`;
        blockEl.style.bottom = `${stageHeight - liftDepth - BLOCK_HEIGHT - 15}px`;
    }, 600);

    // Stage 3: Move Horizontally over target coordinates
    setTimeout(() => {
        armBeam.style.left = `${endX + (BLOCK_WIDTH / 2)}px`;
        gripper.style.left = `${endX + (BLOCK_WIDTH / 2) - 18}px`;
        blockEl.style.left = `${endX}px`;
    }, 1200);

    // Stage 4: Lower the Block into final structural slot destination position
    setTimeout(() => {
        const dropDepth = stageHeight - endY - BLOCK_HEIGHT - 15;
        armBeam.style.height = `${dropDepth}px`;
        gripper.style.top = `${dropDepth + 15}px`;
        blockEl.style.bottom = `${endY}px`;
    }, 1800);

    // Stage 5: Release Gripper, detach and return Robot Arm back up to safety height
    setTimeout(() => {
        // Update structural state arrays tracking profiles cleanly
        trackingStacks[fromSlot].splice(fromHeightIndex, 1);
        trackingStacks[toSlot].push(blockId);
        
        armBeam.style.height = '60px';
        gripper.style.top = '75px';
        
        callback();
    }, 2400);
}

/**
 * Triggers execution mechanics processing for the NEXT step in sequential index
 */
function executeNextStep() {
    if (currentStepIndex >= PLAN_STEPS.length - 1) {
        isPlaying = false;
        updateUIControls();
        actionLog.innerText = "GOAL STATE REACHED: SUCCESS! H is on G, G is on F... down to A on the floor.";
        return;
    }

    currentStepIndex++;
    updateUIControls();
    
    const stepData = PLAN_STEPS[currentStepIndex];
    actionLog.innerText = `[ACTION]: ${stepData.text}`;
    stepCounter.innerText = `${String(currentStepIndex + 1).padStart(2, '0')} / ${PLAN_STEPS.length}`;

    setNavButtonsDisabled(true);

    animateMove(stepData.block, stepData.fromSlot, stepData.toSlot, () => {
        setNavButtonsDisabled(false);
        if (isPlaying) {
            animationTimeout = setTimeout(executeNextStep, 500);
        } else {
            updateUIControls();
        }
    });
}

/**
 * Reverts simulation configuration data mapping back one step smoothly
 */
function executePreviousStep() {
    if (currentStepIndex < 0) return;

    setNavButtonsDisabled(true);
    const stepData = PLAN_STEPS[currentStepIndex];
    
    actionLog.innerText = `[REVERSING]: Retracting Step ${currentStepIndex + 1}`;

    // Invert source and target locations for tracking rollback transformations
    animateMove(stepData.block, stepData.toSlot, stepData.fromSlot, () => {
        currentStepIndex--;
        setNavButtonsDisabled(false);
        updateUIControls();

        if (currentStepIndex >= 0) {
            actionLog.innerText = `ROLLED BACK. PREVIOUS STEP: ${PLAN_STEPS[currentStepIndex].text}`;
            stepCounter.innerText = `${String(currentStepIndex + 1).padStart(2, '0')} / ${PLAN_STEPS.length}`;
        } else {
            actionLog.innerText = "ROLLED BACK TO SYSTEM INITIAL STATE.";
            stepCounter.innerText = `00 / ${PLAN_STEPS.length}`;
        }
    });
}

/**
 * Disables directional interactive controls during translation executions
 */
function setNavButtonsDisabled(disabledState) {
    btnPrev.disabled = disabledState || currentStepIndex < 0;
    btnNext.disabled = disabledState || currentStepIndex >= PLAN_STEPS.length - 1;
    btnReset.disabled = disabledState;
}

/**
 * Synchronizes Control Interface states dynamically based on status properties
 */
function updateUIControls() {
    if (isPlaying) {
        btnPlay.disabled = true;
        btnPause.disabled = false;
        btnPrev.disabled = true;
        btnNext.disabled = true;
    } else {
        btnPlay.disabled = currentStepIndex >= PLAN_STEPS.length - 1;
        btnPause.disabled = true;
        btnPrev.disabled = currentStepIndex < 0;
        btnNext.disabled = currentStepIndex >= PLAN_STEPS.length - 1;
    }
}

// ============================================================================
// UI EVENT HANDLERS REGISTRATION
// ============================================================================

btnPlay.addEventListener('click', () => {
    if (!isPlaying && currentStepIndex < PLAN_STEPS.length - 1) {
        isPlaying = true;
        updateUIControls();
        executeNextStep();
    }
});

btnPause.addEventListener('click', () => {
    isPlaying = false;
    clearTimeout(animationTimeout);
    updateUIControls();
    actionLog.innerText = "[PAUSED]: Motion execution stopped by operator.";
});

btnNext.addEventListener('click', () => {
    if (currentStepIndex < PLAN_STEPS.length - 1) {
        executeNextStep();
    }
});

btnPrev.addEventListener('click', () => {
    if (currentStepIndex >= 0) {
        executePreviousStep();
    }
});

btnReset.addEventListener('click', () => {
    initializeSimulation();
});

// Window lifecycle binding initial execution entry point triggering
window.addEventListener('load', initializeSimulation);
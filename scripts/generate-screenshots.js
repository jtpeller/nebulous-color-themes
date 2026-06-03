const { _electron: electron } = require('@playwright/test');
const { downloadAndUnzipVSCode } = require('@vscode/test-electron');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

/// Sets up the window for consistency.
async function setupFiles(page) {
    // Screenshot config for Side A / Side B.
    const shot = {
        sideA: {
            active: '.samples/sample.py',
            inactive1: '.samples/sample.dart',
            inactive2: 'README.md'
        },
        sideB: {
            active: '.samples/sample.ts',
            inactive1: '.samples/sample.swift',
            inactive2: 'CHANGELOG.md'
        }
    };

    // Helper to open a file via Quick Open (Ctrl+P)
    const openFile = async (fileName) => {
        await page.waitForTimeout(1000);    // Wait a little bit before attempting
        await page.keyboard.press('Control+P');
        await page.waitForTimeout(2000); // Wait for the input to appear
        await page.keyboard.type(fileName);
        await page.waitForTimeout(500); // Wait for the list to filter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000); // Wait for the file to load and tokenize
    };


    /// LOAD THE FILES

    // Side A (Left Group)
    // Open inactive files first, then the active one to ensure it has focus
    await openFile(shot.sideA.inactive2);
    await openFile(shot.sideA.inactive1);
    await openFile(shot.sideA.active);

    // Split editor
    // This creates a second group (Side B) and moves focus to it
    await page.keyboard.press('Control+\\');
    await page.waitForTimeout(1000);

    // Side B (Right Group)
    // Focus is now on the right side. Open inactive then active.
    await openFile(shot.sideB.inactive2);
    await openFile(shot.sideB.inactive1);
    await openFile(shot.sideB.active);
}

async function initWindow(page) {
    // Dismiss any potential notifications or overlays
    await page.keyboard.press('Escape');

    // Force Side Bar to Explorer view
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(500);

    // Close secondary side bar
    await page.keyboard.press('Control+Alt+B');
    await page.waitForTimeout(500);

    // Zoom in to make the UI and code larger for screenshots (simulating Ctrl + =)
    //const zoomCount = 1;
    //for (let i = 0; i < zoomCount; i++) {
    //    await page.keyboard.press('Control+=');
    //    await page.waitForTimeout(500); // Wait for the UI layout to adjust
    //}

    // Setup all the files
    await setupFiles(page);
}

async function captureThemeScreenshots() {
    // Get themes from package.json dynamically
    const themes = pkg.contributes.themes;
    const outputFolder = path.join(__dirname, '..', 'assets', 'images');
    
    // Make the output dir if it doesn't exist yet.
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Locate / obtain VSCode executable.
    console.log('Locating VS Code executable...');
    const executablePath = await downloadAndUnzipVSCode();
    const userDataDir = path.join(__dirname, '..', '.vscode-test-user-data');

    // Ensure a "fresh" window by clearing previous session data (resets zoom, sidebar state, etc.)
    if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }

    // Launch VS Code with your extension loaded
    const app = await electron.launch({
        executablePath,
        args: [
            `--extensionDevelopmentPath=${path.join(__dirname, '..')}`,
            //'--disable-extensions', // Disable other extensions for clean shots
            '--disable-workspace-trust', // Prevent trust prompt
            '--skip-welcome', // Suppress the Welcome page
            '--skip-release-notes', // Suppress the Release Notes page
            '--no-sandbox',
            '--window-size=1600,900', // Set initial window size
            `--user-data-dir=${userDataDir}`,
            path.join(__dirname, '..') // Open the project root folder
        ]
    });

    // Get the first window.
    const page = await app.firstWindow();
    
    // Wait for workbench to load
    await page.waitForSelector('.monaco-workbench');

    // Give some extra time for everything to load.
    await page.waitForTimeout(30000);

    // Initialize the window.
    await initWindow(page);

    // Now that the layout is set, iterate through themes
    for (const theme of themes) {
        console.log(`Capturing theme: ${theme.label}`);

        // Open Command Palette and change theme
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.press('Control+K');
        await page.keyboard.press('Control+T');
        
        // Wait for the theme picker to appear
        await page.waitForSelector('.quick-input-widget');

        // Type the specific theme label
        await page.keyboard.type(theme.label);
        await page.waitForTimeout(2000); // Pause to allow the list to filter
        await page.keyboard.press('Enter');

        // Give the UI and syntax highlighting a moment to settle on both sides
        await page.waitForTimeout(3000);

        // Capture the screenshot
        const safeThemeName = theme.label.replace(/Nebulous\s*/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileName = `theme-${safeThemeName}.png`;
        await page.screenshot({ path: path.join(outputFolder, fileName) });
    }

    // Close the app and report success
    await app.close();
    console.log('All screenshots captured successfully.');

    // Remove the test data when complete.
    if (fs.existsSync(userDataDir)) {
        console.log('Removing user data...');
        fs.rmSync(userDataDir, { recursive: true, force: true });
        console.log('Done!');
    }
}

captureThemeScreenshots().catch((err) => {
    console.error(err);
    process.exit(1);
});
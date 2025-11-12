# Just Commit

A minimal VSCode extension to generate commit messages using Google's Gemini AI.

<p align="center">
<img width="450" alt="Just Commit" src="https://github.com/user-attachments/assets/be197a7e-3c5c-4fd8-bd99-fcf6ee301250" />
</p>

## Features

-   Generates a commit message based on your current Git changes.
-   Uses the Gemini model you specify.
-   Integrates with the Source Control view.

## Configuration

Before using the extension, you need to configure your Gemini API key:

1.  Open the **Extensions** view (Ctrl/Cmd + Shift + X).
2.  Find "Just Commit" in your list of installed extensions.
3.  Click the **gear icon** (⚙️) next to it and select **Extension Settings**.
4.  Fill in your **Gemini Api Key**. You can get one from [Google AI Studio](https://aistudio.google.com/app/api-keys).
5.  You can also configure the Gemini Model and add any custom instructions on this page.

<p align="center">
<img width="650" alt="Just Commit Settings" src="https://github.com/user-attachments/assets/f9e833ee-a221-4642-adf0-0c18920795f2" />
</p>

## Usage

1.  Make some changes in your Git repository.
2.  Go to the Source Control view.
3.  Click the "Just Commit" icon at the top of the Source Control panel.
4.  The extension will analyze your changes and populate the commit message box.

## Build and Install from Source

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/achendev/justcommit.git
    cd justcommit
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Package the extension:**
    This will create a `.vsix` file (e.g., `justcommit-1.0.0.vsix`).
    ```bash
    npm run build
    ```

4.  **Install the extension in VSCode:**
    *   Open VSCode.
    *   Go to the Extensions view (Ctrl/Cmd + Shift + X).
    *   Click the `...` menu in the top-right corner.
    *   Select "Install from VSIX...".
    *   Choose the `.vsix` file you created in the previous step.

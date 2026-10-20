# Roadmap

Work I plan to do, roughly in order. Effort estimates are rough.

## Editor (≈10 h)

- [x] Undo / redo for every edit (history stack in the store)
- [x] Copy, paste and duplicate the selected node (Ctrl+C, Ctrl+V, Ctrl+D)
- [ ] Multi-select and box selection to move, copy and delete groups of nodes (copies keep the links inside the group)
- [ ] Auto-layout of the graph (left-to-right layered layout)
- [ ] Comment / sticky-note nodes and coloured groups for organising large conversations
- [ ] Search for nodes by text, speaker or variable
- [ ] Rename a variable everywhere it's used
- [ ] Keyboard shortcuts for adding node types
- [ ] Speaker list with portraits and colours, picked from a dropdown instead of free text

## Dialogue features (≈6 h)

- [ ] Multiple conversations per project file, with a jump node between them
- [ ] Random node (pick one outgoing branch at random, optionally weighted)
- [ ] "Once only" choice options that hide after being picked
- [ ] Per-line metadata for the game: emotion, animation, audio clip id
- [ ] Number formatting in interpolation (`{gold:0}`) and simple plural forms

## Playtest (≈3 h)

- [ ] Edit variable values mid-playtest to test branches quickly
- [ ] Start a playtest from the selected node
- [ ] Step back in the transcript
- [ ] Coverage view: highlight nodes no playtest has reached yet

## Localisation (≈4 h)

- [ ] Stable string ids for every line and option
- [ ] Export / import strings as CSV for translators
- [ ] Preview the dialogue in another language

## Game integration (≈8 h)

- [ ] Unity package: C# loader for the runtime JSON, expression evaluator and runner matching `src/model/runner.ts`
- [ ] Shared test fixtures so the TypeScript and C# runners must agree on the same scripts
- [ ] JSON Schema for the runtime format
- [ ] Watch mode: re-export automatically into a game project folder
- [ ] Import characters from a Forge GDD

## Quality (≈4 h)

- [ ] Component tests for the inspector and playtest panel
- [ ] End-to-end test that builds a small dialogue through the UI and plays it
- [ ] File format migrations when the version number changes
- [ ] GitHub Actions: typecheck, test and build on every push
- [ ] Deploy the editor to GitHub Pages

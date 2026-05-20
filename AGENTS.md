## Skills
Project skills are in `.claude/skills/`. Always read and follow the 
relevant skill file before starting any task.

## Block Development Workflow

When asked to create or modify AEM Edge Delivery blocks, always follow this process:

1. **Start with the `content-driven-development` skill** — never jump straight to implementation
2. Only invoke `building-blocks` during Step 5 (Implementation) of the CDD process
3. Skills are located in `.claude/skills/`

### Example trigger phrases:
- "Create an accordion block"
- "Build a carousel block"
- "Add a hero block variant"

### To create a new block (e.g. accordion):
Invoke the content-driven-development skill and specify:
- Block name: `accordion`
- Purpose: collapsible content sections
- Follow all CDD steps before touching any code
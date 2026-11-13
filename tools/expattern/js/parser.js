class CommandParser {
    constructor(turtle) {
        this.turtle = turtle;
    }

    // Main execution method
    execute(commandString, iterations = 1) {
        let cmd = commandString;

        // Pre-process: Expand macros/promises
        // We pass 'iterations' (n) to preprocess
        for (let i = 0; i < iterations; i++) {
            cmd = this.preprocess(cmd, iterations);
        }

        console.log("Executing:", cmd);
        this.runCommands(cmd);
    }

    preprocess(input, n) {
        let output = input;

        // 1. Remove whitespace
        output = output.replace(/\s/g, "");

        // 2. Handle Parentheses with Math (e.g., (n)s -> 3s)
        // We look for (...) and try to evaluate it as a math expression with 'n'
        output = this.expandParentheses(output, n);

        // 3. Expand numeric multipliers for variables (e.g., 3X -> XXX)
        const vars = this.turtle.variables;
        for (const name in vars) {
            const regex = new RegExp(`(\\d+)(${name})`, 'g');
            output = output.replace(regex, (match, num, char) => {
                return char.repeat(parseInt(num));
            });
        }

        // 4. Expand variables (e.g., X -> sss)
        let expanded = "";
        for (let i = 0; i < output.length; i++) {
            const char = output[i];
            if (vars[char]) {
                expanded += vars[char];
            } else {
                expanded += char;
            }
        }
        output = expanded;

        // 5. Expand numeric multipliers for commands (e.g., 3s -> sss)
        const cmdRegex = /(\d+)([stlrudLRUDpabc\[\]])/g;
        output = output.replace(cmdRegex, (match, num, char) => {
            return char.repeat(parseInt(num));
        });

        return output;
    }

    expandParentheses(input, n) {
        // Regex to find parenthesized groups
        const regex = /\(([^()]+)\)/g;

        let current = input;
        let match;

        // Keep replacing until no more parens (or max depth to avoid infinite loop)
        let depth = 0;
        while ((match = regex.exec(current)) !== null && depth < 10) {
            const fullMatch = match[0];
            const content = match[1];

            try {
                // Safe evaluation of math expression
                // We allow numbers, n, and basic operators
                if (/^[0-9n\+\-\*\/\%\s\.]+$/.test(content)) {
                    // Create a function to evaluate with 'n' in scope
                    const func = new Function('n', `return ${content};`);
                    const result = func(n);
                    current = current.replace(fullMatch, result);
                } else {
                    // If it contains other chars, maybe it's not a math expr?
                    // Let's just remove parens if it's not math
                    current = current.replace(fullMatch, content);
                }
            } catch (e) {
                // If eval fails, just remove parens
                current = current.replace(fullMatch, content);
            }

            // Reset regex lastIndex because string changed
            regex.lastIndex = 0;
            depth++;
        }
        return current;
    }

    runCommands(cmd) {
        for (let i = 0; i < cmd.length; i++) {
            const c = cmd[i];
            switch (c) {
                case 's': this.turtle.forward(); break;
                case 't': this.turtle.back(); break;
                case 'l': this.turtle.moveLeft(); break; // Original 'l' was up/moveLeft
                case 'r': this.turtle.moveRight(); break; // Original 'r' was down/moveRight
                case 'L': this.turtle.rotateLeft(); break; // Original 'L' was Up/rotateLeft
                case 'R': this.turtle.rotateRight(); break; // Original 'R' was Down/rotateRight
                case 'p':
                    if (this.turtle.pen) this.turtle.penUp();
                    else this.turtle.penDown();
                    break;
                case '[': this.turtle.push(); break;
                case ']': this.turtle.pop(); break;

                // Colors
                case 'a': this.turtle.setColor('red'); break;
                case 'b': this.turtle.setColor('blue'); break;
                case 'c': this.turtle.setColor('default'); break;

                default:
                    // Ignore unknown characters
                    break;
            }
        }
    }
}

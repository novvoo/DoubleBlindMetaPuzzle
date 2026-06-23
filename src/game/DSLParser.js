/**
 * DSL parser for game behavior/level scripting.
 * Parses rule definitions such as:
 *   BABA IS PUSH
 *   WALL IS STOP
 *   FLAG IS WIN
 *   KEKE IS YOU
 * Lines starting with # are comments.
 */
export class DSLParser {
  constructor(source) {
    this.source = source;
  }

  parse() {
    const commands = [];
    const lines = this.source.split('\n');
    for (let line of lines) {
      line = line.trim();
      // Skip empty lines and comments
      if (line === '' || line.startsWith('#')) continue;
      
      // Split into tokens by whitespace
      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;
      
      const entity = parts[0].toUpperCase();
      const connector = parts[1].toLowerCase();
      const property = parts[2].toUpperCase();
      
      // Accept "IS" or "HAS" as connectors
      if (connector === 'is' || connector === 'has') {
        commands.push({ entity, property });
      }
      // Future: could support other command types here
    }
    return {
      type: 'script',
      commands,
    };
  }

  static fromString(input) {
    const parser = new DSLParser(input);
    return parser.parse();
  }
}

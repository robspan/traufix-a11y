module.exports = {
  name: 'formFieldName',
  description: 'Form fields inside forms must have name attributes for proper submission',
  tier: 'full',
  type: 'html',
  weight: 7,

  check(content) {
    const issues = [];

    // Pattern to find <form> elements and their content
    const formPattern = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formPattern.exec(content)) !== null) {
      const formContent = formMatch[1];

      // Check input elements (excluding buttons and submit/reset types which don't need names)
      const inputPattern = /<input([^>]*)>/gi;
      let inputMatch;

      while ((inputMatch = inputPattern.exec(formContent)) !== null) {
        const attributes = inputMatch[1];

        // Extract type attribute
        const typeMatch = attributes.match(/\stype\s*=\s*["']([^"']+)["']/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'text'; // default type is text

        // Skip buttons, submit, reset, image (these don't require name for data submission)
        const skipTypes = ['button', 'submit', 'reset', 'image'];
        if (skipTypes.includes(type)) {
          continue;
        }

        // Check for name attribute (static or Angular binding)
        const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes) ||
                        /\[name\]/i.test(attributes) ||
                        /\[attr\.name\]/i.test(attributes) ||
                        /formControlName/i.test(attributes) ||
                        /\[formControlName\]/i.test(attributes);

        if (!hasName) {
          const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
          const identifier = idMatch ? ` (id="${idMatch[1]}")` : '';

          issues.push(
            `[Error] Form field <input type="${type}">${identifier} is missing a name attribute. ` +
            `Form fields must be properly identified for form submission and assistive technologies.\n` +
            `  How to fix:\n` +
            `    - Add name="fieldName" for standard HTML forms\n` +
            `    - Use [formControlName]="'controlName'" for Angular Reactive Forms\n` +
            `    - Use name="fieldName" [(ngModel)]="model" for Template-driven Forms\n` +
            `  WCAG 4.1.2: Name, Role, Value | WCAG 3.3.2: Labels or Instructions\n` +
            `  Found: <input type="${type}">${identifier}`
          );
        }
      }

      // Check select elements
      const selectPattern = /<select([^>]*)>/gi;
      let selectMatch;

      while ((selectMatch = selectPattern.exec(formContent)) !== null) {
        const attributes = selectMatch[1];
        const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes) ||
                        /\[name\]/i.test(attributes) ||
                        /\[attr\.name\]/i.test(attributes) ||
                        /formControlName/i.test(attributes) ||
                        /\[formControlName\]/i.test(attributes);

        if (!hasName) {
          const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
          const identifier = idMatch ? ` (id="${idMatch[1]}")` : '';

          issues.push(
            `[Error] Form field <select>${identifier} is missing a name attribute. ` +
            `Form fields must be properly identified for form submission and assistive technologies.\n` +
            `  How to fix:\n` +
            `    - Add name="fieldName" for standard HTML forms\n` +
            `    - Use [formControlName]="'controlName'" for Angular Reactive Forms\n` +
            `    - Use name="fieldName" [(ngModel)]="model" for Template-driven Forms\n` +
            `  WCAG 4.1.2: Name, Role, Value | WCAG 3.3.2: Labels or Instructions\n` +
            `  Found: <select>${identifier}`
          );
        }
      }

      // Check textarea elements
      const textareaPattern = /<textarea([^>]*)>/gi;
      let textareaMatch;

      while ((textareaMatch = textareaPattern.exec(formContent)) !== null) {
        const attributes = textareaMatch[1];
        const hasName = /\sname\s*=\s*["'][^"']+["']/i.test(attributes) ||
                        /\[name\]/i.test(attributes) ||
                        /\[attr\.name\]/i.test(attributes) ||
                        /formControlName/i.test(attributes) ||
                        /\[formControlName\]/i.test(attributes);

        if (!hasName) {
          const idMatch = attributes.match(/\sid\s*=\s*["']([^"']+)["']/i);
          const identifier = idMatch ? ` (id="${idMatch[1]}")` : '';

          issues.push(
            `[Error] Form field <textarea>${identifier} is missing a name attribute. ` +
            `Form fields must be properly identified for form submission and assistive technologies.\n` +
            `  How to fix:\n` +
            `    - Add name="fieldName" for standard HTML forms\n` +
            `    - Use [formControlName]="'controlName'" for Angular Reactive Forms\n` +
            `    - Use name="fieldName" [(ngModel)]="model" for Template-driven Forms\n` +
            `  WCAG 4.1.2: Name, Role, Value | WCAG 3.3.2: Labels or Instructions\n` +
            `  Found: <textarea>${identifier}`
          );
        }
      }
    }

    return {
      pass: issues.length === 0,
      issues
    };
  }
};

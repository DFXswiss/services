## Exporting a React Component as an NPM Package

This guide details how to package and publish a React component as an npm package, both locally using `npm pack` for testing and globally using GitHub Actions for continuous integration and deployment.

### Prerequisites

- Node.js installed on your machine.
- An npm account with an npm access token for publishing.
- A GitHub account with a repository setup for your project.

### Step 1: Prepare Your Component

1. **Organize Your Component Code**:
   Ensure your main component, e.g., `MainWidget`, is properly configured:

   ```tsx
   // src/Main.widget.tsx
   function MainWidget(params) {
     return <div>...</div>;
   }
   export default MainWidget;
   ```

2. **Define Your Package Exports**:
   Set up a `public_api.ts` to define and manage exports cleanly:
   ```tsx
   // src/public_api.ts
   export { default as DfxServices } from './Main.widget';
   ```

### Step 2: Configure TypeScript and Package Settings

1. **Update `tsconfig.json`**:
   Enable TypeScript to compile the package correctly:

   ```json
   {
     "compilerOptions": {
       "outDir": "./dist",
       "declaration": true,
       "module": "commonjs",
       "target": "es6",
       "noEmit": false
     }
   }
   ```

2. **Adjust `package.json`**:
   Include the main entry point, typings, and build script in your `package.json`:
   ```json
   {
     "name": "@dfx.swiss/services-react",
     "version": "1.0.0",
     "license": "MIT",
     "private": false,
     "main": "dist/public_api.js",
     "types": "dist/public_api.d.ts",
     "files": ["dist"],
     "publishConfig": {
       "access": "public"
     },
     "scripts": {
       "build:lib": "tsc"
     }
   }
   ```

### Step 3: Build and Pack Your Component

1. **Compile Your Code**:
   Build your TypeScript files to JavaScript:

   ```bash
   npm run build:lib
   ```

2. **Package Locally**:
   Use `npm pack` to create a local `.tgz` file for testing your package:

   ```bash
   npm pack
   ```

3. **Install and Test Locally**:
   Install the package in a test project to verify its functionality:

   ```bash
   npm install ../path/to/dfx.swiss-services-react-1.0.0.tgz
   ```

### Step 4: Automate Publishing Using GitHub Actions

1. **Update GitHub Actions Workflow**:
   Automate the build and publish steps in your `.github/workflows/dev.yml`:

   ```yaml
   - name: Setup npm
     run: echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_ACCESS_TOKEN }}" > .npmrc

   - name: Publish to npm
     run: npm publish --access public
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_ACCESS_TOKEN }}
   ```

### Step 5: Manage Access and Permissions

- **Secure your npm token** by storing it in GitHub Secrets.
- **Ensure proper permissions** for the npm user used in CI/CD to publish under the organization's scope.

### Conclusion

By following these steps, you can efficiently develop, package, and publish your React component as an npm package. Adjustments might be necessary for specific projects or additional repository settings.

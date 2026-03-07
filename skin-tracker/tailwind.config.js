/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
And your `src/index.css` contains the Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
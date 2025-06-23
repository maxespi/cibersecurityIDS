/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'cyber-blue': '#1e3a8a',
                'cyber-purple': '#7c3aed',
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
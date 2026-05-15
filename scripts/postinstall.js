try {
  if (process.stdout.isTTY && !process.env.CI) {
    console.log('');
    console.log('⭐ If pompelmi is useful, star it on GitHub:');
    console.log('   https://github.com/pompelmi/pompelmi');
    console.log('');
  }
} catch (e) {
  // silently fail — never break the install
}

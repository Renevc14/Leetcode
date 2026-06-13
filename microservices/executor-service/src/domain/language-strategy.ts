export interface LanguageStrategy {
  image: string;
  sourceFile: string;
  compileCmd: string[] | null;
  runCmd: string[];
}

export function getStrategy(language: string, imageMap: Record<string, string>): LanguageStrategy {
  const img = (key: string): string => {
    const image = imageMap[key];
    if (!image) throw new Error(`No image configured for language: ${key}`);
    return image;
  };

  switch (language) {
    case 'PYTHON':
      return {
        image: img('PYTHON'),
        sourceFile: 'main.py',
        compileCmd: null,
        runCmd: ['python3', 'main.py'],
      };
    case 'JAVASCRIPT':
      return {
        image: img('JAVASCRIPT'),
        sourceFile: 'main.js',
        compileCmd: null,
        runCmd: ['node', 'main.js'],
      };
    case 'TYPESCRIPT':
      return {
        image: img('TYPESCRIPT'),
        sourceFile: 'main.ts',
        compileCmd: ['tsc', '--strict', 'false', '--esModuleInterop', 'true', 'main.ts'],
        runCmd: ['node', 'main.js'],
      };
    case 'JAVA':
      return {
        image: img('JAVA'),
        sourceFile: 'Main.java',
        compileCmd: ['javac', 'Main.java'],
        runCmd: ['java', 'Main'],
      };
    case 'CPP':
      return {
        image: img('CPP'),
        sourceFile: 'main.cpp',
        compileCmd: ['g++', '-O2', '-std=c++17', 'main.cpp', '-o', 'main'],
        runCmd: ['./main'],
      };
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

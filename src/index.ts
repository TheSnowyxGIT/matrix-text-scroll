import { Font, text2matrix } from "text2matrix";

type ApplyMatrixOption = {
  duplicate?: boolean;
  duplicate_width?: number;
};

function applyMatrix(
  point: { x: number; y: number },
  matrix: number[][],
  box: number[][],
  options: ApplyMatrixOption = {}
) {
  const duplicate = options.duplicate ?? false;
  const duplicate_width = options.duplicate_width ?? 1;

  const sx = Math.round(point.x);
  const sy = Math.round(point.y);
  box.forEach((row) => {
    row.fill(0);
  });

  for (let y = 0; y < matrix.length; y++) {
    let x = 0;
    while (x < matrix[0].length) {
      const boxX = x + sx;
      const boxY = y + sy;
      if (boxX >= 0 && boxX < box[0].length && boxY >= 0 && boxY < box.length) {
        box[boxY][boxX] = matrix[y][x];
      }
      x += 1;
    }
    if (duplicate) {
      let base = sx + matrix[0].length + duplicate_width;
      x = base;
      while (x < box[0].length) {
        let index = x - base;
        const boxY = y + sy;
        if (x >= 0 && boxY >= 0 && boxY < box.length) {
          box[boxY][x] = matrix[y][index];
        }
        if (index === matrix[0].length - 1) {
          base += matrix[0].length + duplicate_width;
          x += duplicate_width;
        }
        x += 1;
      }
      base = sx - duplicate_width - matrix[0].length;
      x = base + matrix[0].length;
      while (x >= 0) {
        const index = x - base;
        const boxY = y + sy;
        if (x >= 0 && boxY >= 0 && boxY < box.length) {
          box[boxY][x] = matrix[y][index];
        }
        if (x === base) {
          base -= matrix[0].length + duplicate_width;
          x -= duplicate_width;
        }
        x -= 1;
      }
    }
  }
}

type InfiniteResult = {
  waitEnd: () => Promise<void>;
  requestStop: () => void;
};

type InfiniteScrollOptions = {
  font: Font;
  box: { width: number; height: number };
  letterSpacing?: number;
  fontSize?: number;
  speed_x?: number;
  sep_width?: number;
};
export function infiniteScroll(
  text: string,
  fn: (matrix: number[][]) => void,
  options: InfiniteScrollOptions
): InfiniteResult {
  const speed_x = options.speed_x ?? -10;
  const sep_width = options.sep_width ?? 2;
  const matrix = text2matrix(text, options.font, {
    letterSpacing: options.letterSpacing,
    fontSize: options.fontSize,
  });
  const matrixWidth = matrix[0].length;
  const boxMatrix = Array.from<number[]>({ length: options.box.height })
    .fill([])
    .map(() => Array.from<number>({ length: options.box.width }).fill(0));

  let restart_x = Math.sign(speed_x) < 0 ? 0 : -matrixWidth + options.box.width;
  let current_x = 0;
  let y = 0;
  let stopAsked = false;
  const loopP = new Promise<void>((resolve) => {
    const interval_time = 1 / Math.abs(speed_x);
    const interval = setInterval(async () => {
      applyMatrix({ x: current_x, y }, matrix, boxMatrix, {
        duplicate: true,
        duplicate_width: sep_width,
      });
      fn(boxMatrix);

      current_x = current_x + speed_x * interval_time;
      if (
        current_x - sep_width >= options.box.width ||
        current_x + sep_width <= -matrixWidth
      ) {
        current_x = restart_x;
      }
      if (stopAsked) {
        clearInterval(interval);
        resolve();
      }
    }, interval_time * 1000);
  });

  return {
    waitEnd: async () => {
      await loopP;
    },
    requestStop: () => {
      stopAsked = true;
    },
  };
}

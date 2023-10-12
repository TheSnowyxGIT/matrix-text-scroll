import { EventEmitter } from "events";
import { Font, text2matrix } from "text2matrix";

type TextScrollOptions = {
  font: Font;
  box: { width: number; height: number };
  letterSpacing?: number;
  fontSize?: number;
  speed_x?: number;
  speed_y?: number;
  timeBeforeScroll?: number;
};

export class TextScroll extends EventEmitter {
  private matrix: number[][];
  private matrixWidth: number;
  private matrixHeight: number;
  private boxMatrix: number[][];
  constructor(private text: string, private options: TextScrollOptions) {
    super();
    this.matrix = text2matrix(this.text, this.options.font, {
      letterSpacing: this.options.letterSpacing,
      fontSize: this.options.fontSize,
    });
    if (this.matrix.length === 0 || this.matrix[0].length === 0) {
      throw new Error("Invalid text to scroll");
    }
    this.matrixWidth = this.matrix[0].length;
    this.matrixHeight = this.matrix.length;

    this.boxMatrix = Array.from<number[]>({ length: this.options.box.height })
      .fill([])
      .map(() =>
        Array.from<number>({ length: this.options.box.width }).fill(0)
      );
  }

  private applyMatrixToBox(xOffset: number, yOffset: number) {
    xOffset = Math.round(xOffset);
    yOffset = Math.round(yOffset);
    // clear box
    for (let y = 0; y < this.options.box.height; y++) {
      for (let x = 0; x < this.options.box.width; x++) {
        this.boxMatrix[y][x] = 0;
      }
    }
    // apply matrix
    for (let y = 0; y < this.matrixHeight; y++) {
      for (let x = 0; x < this.matrixWidth; x++) {
        const boxX = x + xOffset;
        const boxY = y + yOffset;
        if (
          boxX >= 0 &&
          boxX < this.options.box.width &&
          boxY >= 0 &&
          boxY < this.options.box.height
        ) {
          this.boxMatrix[boxY][boxX] = this.matrix[y][x];
        }
      }
    }
  }

  private isMatrixInBox(xOffset: number, yOffset: number) {
    const xMin = Math.round(xOffset);
    const yMin = Math.round(yOffset);
    const xMax = xMin + this.matrixWidth;
    const yMax = yMin + this.matrixHeight;

    return (
      xMin < this.options.box.width &&
      xMax >= 0 &&
      yMin < this.options.box.height &&
      yMax >= 0
    );
  }

  async waitXMs(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async scroll() {
    const speed_x = this.options.speed_x ?? 1; // per sec
    const speed_y = this.options.speed_y ?? 0; // per sec
    const timeBeforeScroll = this.options.timeBeforeScroll ?? 1000;

    const start_x = 0;
    const start_y = 0;
    const dest_x =
      start_x +
      Math.sign(speed_x) * Math.max(this.options.box.width, this.matrixWidth);
    const dest_y =
      start_y +
      Math.sign(speed_y) * Math.max(this.options.box.height, this.matrixHeight);
    let current_x = start_x;
    let current_y = start_y;

    if (timeBeforeScroll && this.isMatrixInBox(current_x, current_y)) {
      this.applyMatrixToBox(current_x, current_y);
      this.emit("render", this.boxMatrix);
      await this.waitXMs(timeBeforeScroll);
    }

    const scrollP = new Promise<void>((resolve) => {
      const interval_time = Math.min(
        1 / Math.abs(speed_x),
        1 / Math.abs(speed_y)
      );
      const interval = setInterval(async () => {
        this.applyMatrixToBox(current_x, current_y);
        this.emit("render", this.boxMatrix);

        if (current_x === dest_x && current_y === dest_y) {
          clearInterval(interval);
          resolve();
        }

        current_x = current_x + speed_x * interval_time;
        current_y = current_y + speed_y * interval_time;
        current_x = speed_x * (current_x - dest_x) >= 0 ? dest_x : current_x;
        current_y = speed_y * (current_y - dest_y) >= 0 ? dest_y : current_y;
      }, interval_time * 1000);
    });
    await scrollP;
  }
}

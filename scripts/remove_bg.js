const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

async function test() {
    console.log("CWD:", process.cwd());
    const inputPath = path.resolve(process.cwd(), 'scripts', 'input.png');
    console.log("Input Path:", inputPath);

    if (!fs.existsSync(inputPath)) {
        console.error("Input file does not exist!");
        process.exit(1);
    }

    try {
        const image = await Jimp.read(inputPath);
        console.log("Image read successful. W:", image.bitmap.width, "H:", image.bitmap.height);

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            if (r > 230 && g > 230 && b > 230) {
                this.bitmap.data[idx + 3] = 0;
            }
        });

        const outputPath = path.resolve(process.cwd(), 'scripts', 'output.png');
        await image.writeAsync(outputPath);
        console.log("Success! Output saved to:", outputPath);
    } catch (err) {
        console.error("Processing Error:", err);
        process.exit(1);
    }
}

test();

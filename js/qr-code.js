// ============================================================
// QR CODE: minimal byte-mode encoder (EC level L, versions 1-6)
// Used by printQREnabled to render a QR on receipts.
// No dependencies. Exposes window.generateQRCode(text) -> matrix
// and window.qrToSVG(text) -> SVG string.
// ============================================================

(function() {
    'use strict';

    // EC level L tables
    // version: [total codewords, data codewords, ec per block, blocks, alignment]
    const VERSIONS = {
        1:  { total: 26,  data: 19,  ec: 7,  blocks: 1, align: [] },
        2:  { total: 44,  data: 34,  ec: 10, blocks: 1, align: [6, 18] },
        3:  { total: 70,  data: 55,  ec: 15, blocks: 1, align: [6, 22] },
        4:  { total: 100, data: 80,  ec: 20, blocks: 1, align: [6, 26] },
        5:  { total: 134, data: 108, ec: 26, blocks: 1, align: [6, 30] },
        6:  { total: 172, data: 136, ec: 18, blocks: 2, align: [6, 34] }
    };

    // GF(256) tables, primitive polynomial 0x11D
    const GF_EXP = new Array(512);
    const GF_LOG = new Array(256);
    (function() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
            GF_EXP[i] = x;
            GF_LOG[x] = i;
            x <<= 1;
            if (x & 0x100) x ^= 0x11D;
        }
        for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
    })();

    function gfMul(a, b) {
        if (a === 0 || b === 0) return 0;
        return GF_EXP[GF_LOG[a] + GF_LOG[b]];
    }

    // Reed-Solomon generator polynomial for degree n
    function rsGenerator(degree) {
        let gen = [1];
        for (let i = 0; i < degree; i++) {
            const next = new Array(gen.length + 1).fill(0);
            for (let j = 0; j < gen.length; j++) {
                next[j] ^= gfMul(gen[j], GF_EXP[i]);
                next[j + 1] ^= gen[j];
            }
            gen = next;
        }
        return gen;
    }

    function rsRemainder(data, degree) {
        // rsGenerator returns coefficients ascending (constant first); the
        // shift-register division below expects the leading coefficient first.
        const gen = rsGenerator(degree).slice().reverse();
        const remainder = new Array(degree).fill(0);
        for (let i = 0; i < data.length; i++) {
            const factor = data[i] ^ remainder[0];
            remainder.shift();
            remainder.push(0);
            if (factor !== 0) {
                for (let j = 0; j < degree; j++) {
                    remainder[j] ^= gfMul(gen[j + 1], factor);
                }
            }
        }
        return remainder;
    }

    // Byte-mode data bitstream
    function buildDataBits(text) {
        const bytes = [];
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            bytes.push(code & 0xFF);
        }

        let version = null;
        const charCountBits = 8; // versions 1-9
        for (const v in VERSIONS) {
            const cap = VERSIONS[v].data;
            // mode(4) + count(8) + data bytes
            if (8 + charCountBits + bytes.length * 8 <= cap * 8) {
                version = parseInt(v, 10);
                break;
            }
        }
        if (version === null) {
            version = 6; // max supported
            const cap = VERSIONS[6].data;
            const maxBytes = Math.floor((cap * 8 - 12) / 8);
            bytes.length = maxBytes;
        }

        // Bit buffer
        const bits = [];
        function pushBits(value, length) {
            for (let i = length - 1; i >= 0; i--) {
                bits.push((value >> i) & 1);
            }
        }

        pushBits(0b0100, 4);               // byte mode
        pushBits(bytes.length, charCountBits); // char count
        for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

        // Terminator
        const dataCapBits = VERSIONS[version].data * 8;
        const terminator = Math.min(4, dataCapBits - bits.length);
        pushBits(0, terminator);

        // Pad to byte
        while (bits.length % 8 !== 0) bits.push(0);

        // Pad codewords
        const padBytes = [0xEC, 0x11];
        let padIndex = 0;
        while (bits.length < dataCapBits) {
            pushBits(padBytes[padIndex % 2], 8);
            padIndex++;
        }

        const dataCodewords = [];
        for (let i = 0; i < bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
            dataCodewords.push(byte);
        }

        return { version: version, dataCodewords: dataCodewords };
    }

    // Split data into blocks, compute EC per block, interleave
    function interleave(dataCodewords, version) {
        const info = VERSIONS[version];
        const blocks = info.blocks;
        const perBlock = Math.floor(dataCodewords.length / blocks);
        const remainderCount = dataCodewords.length % blocks;

        const dataBlocks = [];
        const ecBlocks = [];
        let offset = 0;
        for (let b = 0; b < blocks; b++) {
            const size = perBlock + (b < remainderCount ? 1 : 0);
            const blockData = dataCodewords.slice(offset, offset + size);
            offset += size;
            dataBlocks.push(blockData);
            ecBlocks.push(rsRemainder(blockData, info.ec));
        }

        // Interleave data
        const interleaved = [];
        const maxLen = Math.max.apply(null, dataBlocks.map(b => b.length));
        for (let i = 0; i < maxLen; i++) {
            for (let b = 0; b < blocks; b++) {
                if (i < dataBlocks[b].length) interleaved.push(dataBlocks[b][i]);
            }
        }
        // Interleave EC
        for (let i = 0; i < info.ec; i++) {
            for (let b = 0; b < blocks; b++) {
                interleaved.push(ecBlocks[b][i]);
            }
        }

        return interleaved;
    }

    // Place finder/timing/alignment/format modules
    function buildMatrix(version, modules) {
        const size = version * 4 + 17;
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix.push(new Array(size).fill(0)); // 0=empty, 1=dark
        }
        // Used set: -1 reserved, 1 used by function, 0 data
        const used = [];
        for (let i = 0; i < size; i++) {
            used.push(new Array(size).fill(-1));
        }

        function setModule(row, col, dark) {
            matrix[row][col] = dark ? 1 : 0;
            used[row][col] = 1;
        }

        function drawFinder(row, col) {
            for (let r = -1; r <= 7; r++) {
                for (let c = -1; c <= 7; c++) {
                    if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
                    const rr = row + r, cc = col + c;
                    const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
                    const isOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
                    const dark = isOuter && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                    setModule(rr, cc, dark);
                    void isBorder;
                }
            }
        }

        // Finder patterns
        drawFinder(0, 0);
        drawFinder(0, size - 7);
        drawFinder(size - 7, 0);

        // Timing patterns
        for (let i = 8; i < size - 8; i++) {
            if (used[6][i] !== 1) setModule(6, i, i % 2 === 0);
            if (used[i][6] !== 1) setModule(i, 6, i % 2 === 0);
        }

        // Alignment patterns
        const align = VERSIONS[version].align;
        for (let a = 0; a < align.length; a++) {
            for (let b = 0; b < align.length; b++) {
                const row = align[a], col = align[b];
                // Skip if overlaps finder
                if (used[row][col] === 1) continue;
                for (let r = -2; r <= 2; r++) {
                    for (let c = -2; c <= 2; c++) {
                        const rr = row + r, cc = col + c;
                        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
                        const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
                        setModule(rr, cc, dark);
                    }
                }
            }
        }

        // Dark module
        setModule(size - 8, 8, true);

        // Reserve format info regions (first + second copy) so data placement skips them
        for (let i = 0; i < 15; i++) {
            let row, col, hrow, hcol;
            if (i < 6) { row = i; col = 8; }
            else if (i < 8) { row = i + 1; col = 8; }
            else { row = size - 15 + i; col = 8; }
            setModule(row, col, false);
            if (i < 8) { hrow = 8; hcol = size - 1 - i; }
            else if (i < 9) { hrow = 8; hcol = 7; }
            else { hrow = 8; hcol = 14 - i; }
            setModule(hrow, hcol, false);
        }

        return { matrix: matrix, used: used, size: size };
    }

    // Place data bits in zigzag, apply mask
    function placeAndMask(text) {
        const built = buildDataBits(text);
        const version = built.version;
        const codewords = interleave(built.dataCodewords, version);
        const base = buildMatrix(version, null);

        // Build bit array
        const bits = [];
        for (let i = 0; i < codewords.length; i++) {
            for (let b = 7; b >= 0; b--) {
                bits.push((codewords[i] >> b) & 1);
            }
        }

        const size = base.size;
        const used = base.used;
        const matrix = base.matrix;

        // Place bits
        let bitIndex = 0;
        let col = size - 1;
        while (col >= 1) {
            if (col === 6) col--; // skip vertical timing
            for (let rowShift = 0; rowShift < size; rowShift++) {
                const upward = ((Math.floor((size - 1 - col) / 2) % 2) === 0);
                const row = upward ? size - 1 - rowShift : rowShift;
                for (let k = 0; k < 2; k++) {
                    const c = col - k;
                    if (used[row][c] === -1) {
                        if (bitIndex < bits.length) {
                            matrix[row][c] = bits[bitIndex++];
                        } else {
                            matrix[row][c] = 0;
                        }
                        used[row][c] = 0;
                    }
                }
            }
            col -= 2;
        }

        return { matrix: matrix, size: size, version: version, used: used };
    }

    // Mask conditions
    const MASKS = [
        (r, c) => (r + c) % 2 === 0,
        (r) => r % 2 === 0,
        (r, c) => c % 3 === 0,
        (r, c) => (r + c) % 3 === 0,
        (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    ];

    function applyMask(matrix, used, size, mask) {
        const m = matrix.map(row => row.slice());
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (used[r][c] !== 0) continue; // only mask data modules
                if (MASKS[mask](r, c)) {
                    m[r][c] = m[r][c] === 1 ? 0 : 1;
                }
            }
        }
        return m;
    }

    // Format info (EC level L)
    function formatInfoBits(mask) {
        const ecl = 1; // L
        let data = (ecl << 3) | mask;
        let g = data << 10;
        for (let i = 14; i >= 10; i--) {
            if (g & (1 << i)) {
                g ^= 0x537 << (i - 10);
            }
        }
        return ((data << 10) | (g & 0x3FF)) ^ 0x5412;
    }

    function drawFormat(matrix, used, size, mask) {
        const bits = formatInfoBits(mask);
        // Reference layout (qrcode lib): bit i (LSB-first) placed at:
        // vertical:  i<6 -> (i,8); i<8 -> (i+1,8); else -> (size-15+i, 8)
        // horizontal:i<8 -> (8,size-1-i); i=8 -> (8,7); else -> (8,14-i)
        for (let i = 0; i < 15; i++) {
            const v = (bits >> i) & 1;

            // vertical copy
            let row, col;
            if (i < 6) { row = i; col = 8; }
            else if (i < 8) { row = i + 1; col = 8; }
            else { row = size - 15 + i; col = 8; }
            matrix[row][col] = v;
            used[row][col] = 1;

            // horizontal copy
            let hrow, hcol;
            if (i < 8) { hrow = 8; hcol = size - 1 - i; }
            else if (i < 9) { hrow = 8; hcol = 7; }
            else { hrow = 8; hcol = 14 - i; }
            matrix[hrow][hcol] = v;
            used[hrow][hcol] = 1;
        }
    }

    // Penalty scoring
    function penaltyScore(matrix, size) {
        let penalty = 0;

        // Rule 1: runs of same color
        for (let r = 0; r < size; r++) {
            let runColor = -1, runLen = 0;
            for (let c = 0; c < size; c++) {
                const v = matrix[r][c];
                if (v === runColor) {
                    runLen++;
                } else {
                    if (runLen >= 5) penalty += 3 + (runLen - 5);
                    runColor = v;
                    runLen = 1;
                }
            }
            if (runLen >= 5) penalty += 3 + (runLen - 5);
        }
        for (let c = 0; c < size; c++) {
            let runColor = -1, runLen = 0;
            for (let r = 0; r < size; r++) {
                const v = matrix[r][c];
                if (v === runColor) {
                    runLen++;
                } else {
                    if (runLen >= 5) penalty += 3 + (runLen - 5);
                    runColor = v;
                    runLen = 1;
                }
            }
            if (runLen >= 5) penalty += 3 + (runLen - 5);
        }

        // Rule 2: 2x2 blocks
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size - 1; c++) {
                const v = matrix[r][c];
                if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
                    penalty += 3;
                }
            }
        }

        // Rule 3: 1011101 with 0000 on either side
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 6; c++) {
                if (matrix[r][c] === 1 && matrix[r][c + 1] === 0 && matrix[r][c + 2] === 1 &&
                    matrix[r][c + 3] === 1 && matrix[r][c + 4] === 1 && matrix[r][c + 5] === 0 &&
                    matrix[r][c + 6] === 1) {
                    const leftOk = (c >= 4 && matrix[r][c - 1] === 0 && matrix[r][c - 2] === 0 && matrix[r][c - 3] === 0 && matrix[r][c - 4] === 0) ||
                        (c - 4 < 0);
                    const rightOk = (c + 7 <= size - 5 && matrix[r][c + 7] === 0 && matrix[r][c + 8] === 0 && matrix[r][c + 9] === 0 && matrix[r][c + 10] === 0) ||
                        (c + 7 > size - 5);
                    if (leftOk || rightOk) penalty += 40;
                }
            }
        }
        for (let c = 0; c < size; c++) {
            for (let r = 0; r < size - 6; r++) {
                if (matrix[r][c] === 1 && matrix[r + 1][c] === 0 && matrix[r + 2][c] === 1 &&
                    matrix[r + 3][c] === 1 && matrix[r + 4][c] === 1 && matrix[r + 5][c] === 0 &&
                    matrix[r + 6][c] === 1) {
                    const leftOk = (r >= 4 && matrix[r - 1][c] === 0 && matrix[r - 2][c] === 0 && matrix[r - 3][c] === 0 && matrix[r - 4][c] === 0) ||
                        (r - 4 < 0);
                    const rightOk = (r + 7 <= size - 5 && matrix[r + 7][c] === 0 && matrix[r + 8][c] === 0 && matrix[r + 9][c] === 0 && matrix[r + 10][c] === 0) ||
                        (r + 7 > size - 5);
                    if (leftOk || rightOk) penalty += 40;
                }
            }
        }

        // Rule 4: dark module balance
        let darkCount = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (matrix[r][c] === 1) darkCount++;
            }
        }
        const total = size * size;
        const percent = (darkCount * 100) / total;
        const prevMultiple = Math.floor(percent / 5) * 5;
        const nextMultiple = prevMultiple + 5;
        const dist = Math.min(Math.abs(percent - prevMultiple), Math.abs(percent - nextMultiple));
        penalty += Math.floor(dist / 5) * 10;

        return penalty;
    }

    // Public: returns matrix (array of arrays of 0/1) of the final QR
    function generateQRCode(text) {
        if (typeof text !== 'string' || text.length === 0) text = ' ';
        const placed = placeAndMask(text);
        const size = placed.size;

        let best = null;
        for (let mask = 0; mask < 8; mask++) {
            const masked = applyMask(placed.matrix, placed.used, size, mask);
            drawFormat(masked, placed.used, size, mask);
            const score = penaltyScore(masked, size);
            if (!best || score < best.score) {
                best = { matrix: masked, score: score };
            }
        }
        return best.matrix;
    }

    // Render to SVG (scalable, printer-friendly)
    function qrToSVG(text) {
        const matrix = generateQRCode(text);
        const n = matrix.length;
        const scale = 3;
        const padding = 4 * scale;
        const size = n * scale + padding * 2;
        let cells = '';
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (matrix[r][c] === 1) {
                    cells += `<rect x="${padding + c * scale}" y="${padding + r * scale}" width="${scale}" height="${scale}"/>`;
                }
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${cells}</svg>`;
    }

    // Render to HTML table (used in receipts where SVG may not print)
    function qrToTable(text) {
        const matrix = generateQRCode(text);
        const n = matrix.length;
        let html = '<table class="qr-grid" style="border-collapse:collapse;margin:0 auto;">';
        for (let r = 0; r < n; r++) {
            html += '<tr>';
            for (let c = 0; c < n; c++) {
                html += `<td style="width:1px;height:1px;padding:0;border:0;background:${matrix[r][c] ? '#000' : '#fff'};"></td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        return html;
    }

    window.generateQRCode = generateQRCode;
    window.qrToSVG = qrToSVG;
    window.qrToTable = qrToTable;
})();

// Для оптимизации все массивы не двумерные, а линейные
// С такой арифметикой, как ниже, безопаснее использовать только степени двойки )
// В исходных условиях — проверка размерности в 1000 точек, но на экран это влезет только с полосой прокрутки

// Дальнейшая оптимизация возможна как для отрисовки, так и для подсчёта:
// - битовые операции сразу над несколькими полями,
// - хранение в памяти наиболее частых комбинаций,
// - в случае разреженных массивов возможно хранение только координат заполненных клеток и т.д.

const FrameXLimit = 1408, FrameYLimit = 1024;
const MaxXLimit = 1408, MaxYLimit = 1024;
const DotMax = 32;
let FrameX = 0, FrameY = 0, MaxX = 24 * 32, MaxY = 16 * 32, FrameXMax = MaxX, FrameYMax = MaxY, Dot = DotMax / 2;

const Byte = 4;
const RGBA = new Uint8ClampedArray(FrameXLimit * FrameYLimit * Byte);
const RorGorB = 1; // draw with "R or G or B" color
const Long = MaxXLimit * MaxYLimit;
let Prev = Array(Long);
let context;
let Cursor = {x: 0, y: 0};
let canvasToDrag = null;
let deltaY, deltaX;

function init() {
    RGBA.fill(0); // Zero the RGBA...
    for (x = 3; x < FrameXLimit * FrameYLimit * Byte; x += Byte) RGBA[x] = 255; // ...And set the Brightness only
    Prev.fill(0);
}

function zoom(event) {
    event.preventDefault();
    let NewDotSize = event.deltaY > 0 ? Dot >> 1 : Dot << 1;
    NewDotSize = Math.max(Math.min(DotMax, NewDotSize), 1);
    if (Dot === NewDotSize) return;
    Dot = NewDotSize;
}

function draw() {
    for (x = 0; x < FrameXLimit * FrameYLimit * Byte; x += Byte) RGBA[x] = x % 4 === 3 ? 255 : 0; // Set the Brightness only
    let pointerRGB = RorGorB;
    let pointer = 0;
    let width = FrameXMax > MaxX ? MaxX : FrameXMax;
    let height = FrameYMax > MaxY ? MaxY : FrameYMax;
    for (y = FrameY; y < FrameY + height / Dot; y++) {
        for (x = FrameX; x < FrameX + width / Dot; x++) {
            let color = Prev[pointer + y * MaxX + x] === 0 ? 0 : 255;
            for (yDot = 0; yDot < Dot; yDot++)
                for (xDot = 0; xDot < Dot; xDot++)
                    RGBA[pointerRGB + (xDot + yDot * width) * Byte] = color;
            if (Dot >= 4) { // Рисуем сетку, если точки большие
                for (yDot = 0; yDot < Dot; yDot++) RGBA[pointerRGB + yDot * width * Byte] = 32;
                for (xDot = 0; xDot < Dot; xDot++) RGBA[pointerRGB + xDot * Byte] = 32;
            }
            pointerRGB += Dot * Byte;
        }
        pointerRGB += width * Byte * (Dot - 1); // Двигаем указатель на следующую строку
    }
    console.log(Dot, width, height, pointerRGB);
    let array = new ImageData(RGBA.subarray(0, width * height * Byte), width);
    context.putImageData(array, 0, 0);
}

function iterate() {
    const _2to1 = (x, y) => MaxX * y + x; // Там, где оптимизация не нужна, преобразуем двумерные координаты в одномерные через умножение
    let Next = Array(MaxX * MaxY).fill(0);
    for (i = 1; i < MaxY - 1; i++) {
        Prev[_2to1(0, i)] = Prev[_2to1(MaxY - 2, i)]; // Имитируем поверхность тора
        Prev[_2to1(i, 0)] = Prev[_2to1(i, MaxX - 2)];
        Prev[_2to1(MaxY - 1, i)] = Prev[_2to1(1, i)];
        Prev[_2to1(i, MaxX - 1)] = Prev[_2to1(i, 1)];
    }
    Prev[_2to1(0, 0)] = Prev[_2to1(MaxY - 2, MaxX - 2)]; // Углы почему-то не укладываются в цикл выше
    Prev[_2to1(MaxY - 1, MaxX - 1)] = Prev[_2to1(1, 1)];
    Prev[_2to1(MaxX - 1, 0)] = Prev[_2to1(1, MaxY - 2)];
    Prev[_2to1(0, MaxY - 1)] = Prev[_2to1(MaxY - 2, 1)];

    for (x = MaxX; x < (MaxX - 1) * MaxY; x++) // Перебираем всё, кроме верхнего и нижнего рядов
        if (x % MaxX !== 0 && x % MaxX !== MaxX - 1) { // Не проверяем крайние точки в каждом ряду
            let count = Prev[x - 1] + Prev[x + 1]
                + Prev[x - MaxX - 1] + Prev[x - MaxX] + Prev[x - MaxX + 1]
                + Prev[x + MaxX - 1] + Prev[x + MaxX] + Prev[x + MaxX + 1];
            Next[x] = count === 2 ? Prev[x] : count === 3 ? 1 : 0;
        }
    Prev = Next;
}

function startMove(e) {
    console.log("startMove");
    if (canvasToDrag) {
        getCursorPos(e);
        deltaX = Cursor.x - FrameX;
        deltaY = Cursor.y - FrameY // canvasToDrag.offsetTop;
    }
}

function drop() {
    console.log("drop");
    if (canvasToDrag) canvasToDrag = null;
}

function getCursorPos(e) {
    e = e || window.event;
    if (e.pageX || e.pageY) {
        Cursor.x = e.pageX;
        Cursor.y = e.pageY;
    } else {
        let de = document.documentElement;
        let db = document.body;
        Cursor.x = e.clientX + (de.scrollLeft || db.scrollLeft) - (de.clientLeft || 0);
        Cursor.y = e.clientY + (de.scrollTop || db.scrollTop) - (de.clientTop || 0);
    }
    return Cursor;
}

function moving(e) {
    console.log("moving");
    getCursorPos(e);
    if (canvasToDrag) {
        FrameX = Math.max(Math.min(FrameXMax, Cursor.x - deltaX), 0);
        FrameY = Math.max(Math.min(FrameYMax, Cursor.y - deltaY), 0);
    }
}

function setRanges() {
    document.getElementById("FrameX").value = FrameXMax;
    document.getElementById("FrameY").value = FrameYMax;
    document.getElementById("MaxX").value = MaxX;
    document.getElementById("MaxY").value = MaxY;
}

function clear() {
    console.log("clear");
    for (i = 0; i < MaxXLimit * MaxYLimit; i++) Prev[i] = 0;
    for (i = 0; i < FrameXLimit * FrameYLimit * Byte; i += Byte) RGBA[i] = i % 4 === 3 ? 255 : 0; // Set the Brightness only
}

function setRandom() {
    for (i = 0; i < MaxX * MaxY; i++) Prev[i] = Math.random() < 0.25 ? 1 : 0;
}

function setPlaner() {
    let set = [
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1]];
    let MaxXSet = set[0].length, MaxYSet = set.length;
    for (y = 0; y < MaxYSet; y++) for (x = 0; x < MaxXSet; x++) {
        Prev [(y + 1) * MaxX + x + 1] = set[x][y];
        Prev [(y + MaxY / 2) * MaxX + x + 1] = set[x][y];
        Prev [(y + MaxY / 4) * MaxX + x + 1] = set[x][y];
    }
}

function setGlider() {
    let set = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    let MaxXSet = set[0].length, MaxYSet = set.length;
    for (y = 0; y < MaxYSet; y++) for (x = 0; x < MaxXSet; x++) Prev[(y + 3) * MaxX + x + 3] = set[y][x];
}

function setSpaceship() {
    let set = [
        [0, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0],
    ];
    let MaxXSet = set[0].length, MaxYSet = set.length;
    for (y = 0; y < MaxYSet; y++) for (x = 0; x < MaxXSet; x++) Prev[(y + 3) * MaxX + x + 3] = set[y][x];
}

function setBlock() {
    let set = [
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    let MaxXSet = set[0].length, MaxYSet = set.length;
    for (y = 0; y < MaxYSet; y++) for (x = 0; x < MaxXSet; x++) Prev[(y + 21) * MaxX + x + 31] = set[y][x];
}

window.onload = () => {

    const canvas = document.querySelector("canvas");
    canvas.onwheel = zoom;
    canvas.onauxclick = function (e) {
        e.preventDefault();
        if (e.button == 1) {
            console.log("click");
            var rect = e.target.getBoundingClientRect();
            var x = Math.trunc((e.clientX - rect.left) / Dot);
            var y = Math.trunc((e.clientY - rect.top) / Dot);
            console.log(x, y);
            let i = x + FrameX + (y + FrameY) * MaxX;
            Prev[i] = 1 - Prev[i];
        }
    }
    canvas.onmousedown = function () {
        canvasToDrag = this;
        document.onmousedown = startMove;
        document.onmouseup = drop;
        document.onmousemove = moving;
    }

    document.getElementById("FrameX").addEventListener("change", function () {
        FrameXMax = Number(this.value);
    });

    document.getElementById("FrameY").addEventListener("change", function () {
        FrameYMax = Number(this.value);
    });

    document.getElementById("MaxX").addEventListener("change", function () {
        clear();
        MaxX = Number(this.value);
    });

    document.getElementById("MaxY").addEventListener("change", function () {
        clear();
        MaxY = Number(this.value);
    });

    document.getElementById("pause").addEventListener("click", function () {
        isPaused = !isPaused;
        isMoving = true;
    });

    document.getElementById("clear").addEventListener("click", function () {
        clear();
    });

    document.getElementById("random").addEventListener("click", function () {
        clear();
        setRandom();
    });

    init();
    setRanges();
    setGlider();

    document.getElementById("special").onchange = function () {
        console.log(this.value);
        clear();
        generation = 0;
        switch (this.value) {
            case "spaceship":
                FrameX = 0, FrameY = 0, MaxX = 24 * DotMax, MaxY = 16 * DotMax, FrameXMax = MaxX, FrameYMax = MaxY, Dot = DotMax / 2;
                setRanges();
                clear();
                setSpaceship();
                break;
            case "glider":
                FrameX = 0, FrameY = 0, MaxX = 24 * DotMax, MaxY = 16 * DotMax, FrameXMax = MaxX, FrameYMax = MaxY, Dot = DotMax / 2;
                setRanges();
                clear();
                setGlider();
                break;
            case "block":
                FrameX = 0, FrameY = 0, MaxX = 24 * DotMax, MaxY = 16 * DotMax, FrameXMax = MaxX, FrameYMax = MaxY, Dot = DotMax / 4;
                setRanges();
                clear();
                setBlock();
                break;
            case "big":
                FrameX = 0, FrameY = 0, FrameXMax = FrameXLimit, FrameYMax = 900, MaxX = MaxXLimit, MaxY = 900, Dot = 1;
                setRanges();
                clear();
                setRandom();
                break;
            case "torus":
                clear();
                FrameX = 0, FrameY = 0, FrameXMax = 32, FrameYMax = 32, MaxX = 32, MaxY = 32, Dot = 1;
                setRanges();
                setPlaner();
                break;
        }
        setRanges();
    };

    let isPaused = true;
    let generation = 0;
    let timeout = 0;
    context = document.getElementById("canvas").getContext("2d");

    async function Function1() {
        do {
            let element = document.getElementById("pause")
            element.classList.remove("active");
            if (isPaused) element.classList.add("active");
            document.getElementById("MaxX_value").textContent = MaxX;
            document.getElementById("MaxY_value").textContent = MaxY;
            document.getElementById("FrameX_value").textContent = FrameXMax;
            document.getElementById("FrameY_value").textContent = FrameYMax;
            context.canvas.width = FrameXMax;
            context.canvas.height = FrameYMax;
            if (!isPaused) {
                iterate();
                generation++;
            }
            draw();
            let timeNew = new Date();
            document.getElementById("time").value = timeNew - time;
            document.getElementById("generation").value = generation;
            time = timeNew;
            await Function2();
        } while (true);
    }

    async function Function2() {
        return new Promise((res, rej) => {
            setTimeout(() => res(), 100);
        })
    }

    Function1();

}
// DOM Elementlerini Tanımlama
const uploadInput = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const downloadBtn = document.getElementById('download');
const resetBtn = document.getElementById('reset');
const sliders = document.querySelectorAll('.filter-slider');

// Yapay Zeka Elementleri
const aiBtn = document.getElementById('ai-bg-remove');
const aiStatus = document.getElementById('ai-status');

// Düzenlenen temel fotoğrafı hafızada tutma
let baseImage = new Image();
let currentFileName = "duzenlenmis_fotograf.png";

// MediaPipe Selfie Segmentation (Yapay Zeka Modeli) Başlatma
let selfieSegmentation;
try {
    selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });
    selfieSegmentation.setOptions({
        modelSelection: 1, // Hızlı model (Web için daha iyi)
    });
    selfieSegmentation.onResults(onAiResults);
} catch (error) {
    console.error("Yapay Zeka yüklenirken hata oluştu:", error);
}

// 1. Fotoğraf Yükleme İşlemi
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    currentFileName = file.name.split('.')[0] + "_duzenlendi.png";
    const reader = new FileReader();
    
    reader.onload = (event) => {
        baseImage.onload = () => {
            canvas.width = baseImage.width;
            canvas.height = baseImage.height;
            placeholder.style.display = 'none';
            resetFilters(); // Yeni fotoğrafta ayarları sıfırla
            applyFilters();
        };
        baseImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Filtreleri Uygulama
function applyFilters() {
    if (!baseImage.src) return;

    const brightness = document.getElementById('brightness').value;
    const contrast = document.getElementById('contrast').value;
    const saturate = document.getElementById('saturate').value;
    const grayscale = document.getElementById('grayscale').value;
    const blur = document.getElementById('blur').value;

    ctx.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
        saturate(${saturate}%)
        grayscale(${grayscale}%)
        blur(${blur}px)
    `;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
}

// Slider (Ayar) Değişimlerini Dinleme
sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const id = e.target.id;
        const value = e.target.value;
        const unit = id === 'blur' ? 'px' : '%';
        document.getElementById(`${id}-val`).innerText = `${value}${unit}`;
        applyFilters();
    });
});

// 3. Yapay Zeka ile Arka Plan Silme İşlemi
aiBtn.addEventListener('click', async () => {
    if (!baseImage.src) {
        alert('Lütfen önce yapay zekanın işlemesi için bir fotoğraf yükleyin.');
        return;
    }
    
    aiBtn.disabled = true;
    aiStatus.style.display = 'block';
    aiStatus.innerText = 'Yapay zeka analiz ediyor... Lütfen bekleyin.';
    
    try {
        // Mevcut canvas görüntüsünü yapay zekaya analiz etmesi için gönderiyoruz
        await selfieSegmentation.send({image: canvas});
    } catch (error) {
        aiStatus.innerText = 'İşlem sırasında bir hata oluştu.';
        console.error(error);
        aiBtn.disabled = false;
    }
});

// Yapay Zeka İşlemi Tamamlandığında Çalışan Fonksiyon
function onAiResults(results) {
    // Geçici bir canvas oluşturup sadece kişiyi maskeliyoruz
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    
    // 1. Önce yapay zekanın çıkarttığı maskeyi (insan silueti) çiz
    tCtx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
    
    // 2. source-in modu sayesinde sadece maskenin içini asıl fotoğrafla doldur
    tCtx.globalCompositeOperation = 'source-in';
    tCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    // Temel görüntümüzü arka planı silinmiş yeni görüntüyle güncelliyoruz ki
    // kişi sonrasında parlaklık vs. ayarları yapmaya devam edebilsin.
    baseImage.onload = () => {
        applyFilters(); // Mevcut filtreleri arka planı silinmiş görsele uygula
        aiBtn.disabled = false;
        aiStatus.innerText = '✨ Arka plan başarıyla silindi!';
        setTimeout(() => { aiStatus.style.display = 'none'; }, 3000);
    };
    baseImage.src = tempCanvas.toDataURL('image/png');
}

// 4. Ayarları Varsayılana Döndürme
function resetFilters() {
    document.getElementById('brightness').value = 100;
    document.getElementById('brightness-val').innerText = '100%';
    
    document.getElementById('contrast').value = 100;
    document.getElementById('contrast-val').innerText = '100%';
    
    document.getElementById('saturate').value = 100;
    document.getElementById('saturate-val').innerText = '100%';
    
    document.getElementById('grayscale').value = 0;
    document.getElementById('grayscale-val').innerText = '0%';
    
    document.getElementById('blur').value = 0;
    document.getElementById('blur-val').innerText = '0px';

    applyFilters();
}

resetBtn.addEventListener('click', resetFilters);

// 5. Şeffaf (PNG) Formatta İndirme İşlemi
downloadBtn.addEventListener('click', () => {
    if (!baseImage.src) {
        alert('Lütfen önce bir fotoğraf yükleyin.');
        return;
    }
    
    const link = document.createElement('a');
    link.download = currentFileName;
    link.href = canvas.toDataURL('image/png', 1.0); // PNG yapıyoruz ki AI ile silinen arka plan şeffaf kalsın
    link.click();
});

// 사진이 일정 크기 이상일 때만 리사이즈/압축한다.
// 아이폰 원본처럼 큰 사진이 느린 모바일 네트워크로 그대로 올라가는 걸 줄이기 위함.
// 넉넉하게 잡아서(기준 용량 크게, 화질 높게) 웬만한 사진은 안 건드리고,
// 디코딩 실패 등 어떤 이유로든 실패하면 원본을 그대로 반환한다(업로드 자체가 막히지 않도록).
const THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB 이하는 그대로 둠
const MAX_DIMENSION = 2000; // 가로/세로 중 큰 쪽 기준
const QUALITY = 0.85;

export function compressImageIfLarge(file) {
  if (!file || file.size <= THRESHOLD_BYTES) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) {
            // 압축했는데 더 커지거나 실패하면 원본 사용
            resolve(file);
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, '.jpg'),
            { type: 'image/jpeg' }
          );
          resolve(compressedFile);
        }, 'image/jpeg', QUALITY);
      } catch (err) {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // HEIC 등 브라우저가 디코딩 못 하는 형식이면 원본 그대로 업로드
      resolve(file);
    };

    img.src = objectUrl;
  });
}

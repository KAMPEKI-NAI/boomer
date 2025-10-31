<<<<<<< HEAD

=======
import multer from "multer"; // Middleware for handling multipart/form-data, primarily used for uploading files

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default upload;
>>>>>>> cd9fe325a1b971b04c15a5d9f77f6f1980fd4bf7



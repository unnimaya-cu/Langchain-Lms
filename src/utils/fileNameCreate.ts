export const fileNameCreate = (req, file, callback) => {
    callback(null, file.originalname);
  };
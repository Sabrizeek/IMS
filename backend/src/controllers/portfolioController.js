const StudentProfile = require("../models/StudentProfile");

async function listFiles(req, res) {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  res.json({ files: profile?.portfolioFiles || [] });
}

async function addFile(req, res) {
  if (!req.file) return res.status(400).json({ message: "File is required" });
  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $push: {
        portfolioFiles: {
          name: req.file.originalname,
          url: `/uploads/${req.file.filename}`,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      },
    },
    { new: true, upsert: true },
  );
  res.status(201).json({ portfolioFiles: profile.portfolioFiles });
}

async function removeFile(req, res) {
  const { fileId } = req.params;
  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { portfolioFiles: { _id: fileId } } },
    { new: true },
  );
  res.json({ portfolioFiles: profile?.portfolioFiles || [] });
}

module.exports = { listFiles, addFile, removeFile };

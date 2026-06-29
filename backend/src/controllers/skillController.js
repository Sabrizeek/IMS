const Skill = require("../models/Skill");

// Get all unique skills
async function getSkills(req, res) {
  try {
    const skills = await Skill.find().sort({ name: 1 });
    // Transform to simple array of strings
    res.json({ skills: skills.map((s) => s.name) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getSkills,
};

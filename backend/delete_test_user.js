const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const User = require('./src/models/User');
    const InternshipApplication = require('./src/models/InternshipApplication');
    const WeeklyRecord = require('./src/models/WeeklyRecord');
    const MonthlyRecord = require('./src/models/MonthlyRecord');

    // Find the user by ID or name
    const user = await User.findOne({ 
      $or: [
        { name: 'has has' },
        { studentId: 'SC/2020/75362' }
      ]
    });

    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }

    console.log('Found user:', user.name, user._id);

    // Delete internship application
    await InternshipApplication.deleteMany({ studentUserId: user._id });
    console.log('Deleted internship applications.');

    // Delete records
    await WeeklyRecord.deleteMany({ studentUserId: user._id });
    await MonthlyRecord.deleteMany({ studentUserId: user._id });
    console.log('Deleted weekly and monthly records.');

    // Delete user
    await User.findByIdAndDelete(user._id);
    console.log('Deleted user.');

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

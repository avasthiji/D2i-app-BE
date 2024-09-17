const { UnauthorizedError } = require("../exceptions");
const Leave = require("../models/Leave");
const User = require("../models/User");
const transporter = require("../utils/Mailer");

module.exports.LeaveService = {
  // Get leaves by userId (for regular users)
  getLeavesByUserId: async (userId) => {
    return await Leave.find({ userId }).sort({ leaveDate: -1 });
  },

  // Get leaves by managerId (for 2nd level managers or admin)
  getLeavesByManagerId: async (managerId) => {
    return await Leave.find({ managerId }).sort({ leaveDate: -1 });
  },

  getAllLeavesForAdmin: async () => {
    return await Leave.find().sort({ leaveDate: -1 });
  },

  // Get leave by leaveId
  getLeaveById: async (leaveId) => {
    return Leave.findById(leaveId);
  },

  createLeave: async (leaveData) => {
    const { userId, leaveStart, leaveEnd, leaveType, dayType, reason } =
      leaveData;

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const manager = await User.findById(user.parent_id);
    if (!manager) throw new Error("Manager not found");

    const newLeave = await Leave.create({
      userId,
      managerId: user.parent_id,
      leaveStart,
      leaveEnd,
      leaveType,
      dayType,
      reason,
      status: "pending",
    });

    const mailOptions = {
      from: user.officialEmail,
      to: manager.officialEmail,
      subject: "New Leave Application",
      html: `<p>Hello ${manager.firstName},</p>
             <p>${user.firstName} has applied for ${
        dayType === 1 ? "full day" : "half day"
      } ${leaveType} leave from ${leaveStart} to ${leaveEnd}.</p>
             <p>Reason: ${reason}</p>
             <p>Kindly review and approve/reject the leave.</p>`,
    };
    await transporter.sendMail(mailOptions);

    return newLeave;
  },

  approveLeave: async (leaveId, managerId) => {
    try {
      const leave = await Leave.findOne({ _id: leaveId, managerId });
      if (!leave) throw new Error("Leave not found or unauthorized");

      leave.status = "approved";
      await leave.save();

      const user = await User.findById(leave.userId);
      const manager = await User.findById(managerId);

      const mailOptions = {
        from: manager.officialEmail,
        to: user.officialEmail,
        subject: "Leave Approved",
        html: `<p>Hello ${user.firstName},</p>
      <p>Your leave has been approved.</p>`,
      };
      await transporter.sendMail(mailOptions);

      return leave;
    } catch (error) {
      throw new UnauthorizedError(error);
    }
  },

  rejectLeave: async (leaveId, managerId) => {
    try {
      const leave = await Leave.findOne({ _id: leaveId, managerId });
      if (!leave) throw new Error("Leave not found or unauthorized");

      leave.status = "rejected";
      await leave.save();

      const user = await User.findById(leave.userId);
      const manager = await User.findById(managerId);

      const mailOptions = {
        from: manager.officialEmail,
        to: user.officialEmail,
        subject: "Leave Rejected",
        html: `<p>Hello ${user.firstName},</p>
             <p>Your leave on ${leave.leaveDate} has been rejected.</p>`,
      };
      await transporter.sendMail(mailOptions);

      return leave;
    } catch (error) {
      throw new UnauthorizedError(error);
    }
  },
};

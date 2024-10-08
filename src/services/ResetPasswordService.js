const { ValidationError } = require("../exceptions");
const User = require("../models/User");
const { ApiResponse } = require("../utils/ApiHelper");
const { TABLE_NAMES } = require("../utils/db");
const {
  insertRecord,
  getRecordByKey,
  updateRecordsByKey,
} = require("../utils/QueryBuilder");

const AuthService = require("./AuthService");
const { sendNotification } = require("../config/onesignal");

module.exports.ResetPasswordService = {
  registerUser: async ({ inviteCode, password }) => {
    try {
      // Find the user by inviteCode and ensure they are still in the 'invited' state
      const user = await getRecordByKey(TABLE_NAMES.USERS, {
        inviteCode: inviteCode,
        userState: "invited",
      });

      if (!user) {
        throw new Error("Invalid or expired invite code");
      }

      // Update the user record to set the password and change the state to 'active'
      const updatedUser = await updateRecordsByKey(
        TABLE_NAMES.USERS,
        { inviteCode: inviteCode },
        {
          password: password,
          userState: "active",
          inviteCode: null,
        }
      );

      if (!updatedUser) {
        throw new Error("User password reset-request failed");
      }

      const notificationMessage = `Welcome ${updatedUser.firstName} ${updatedUser.lastName}, we just got a new member!`;
      await sendNotification("New Member Joined", notificationMessage, "All");

      // Generate a token
      const authToken = AuthService.createToken(
        updatedUser._id,
        updatedUser.role
      );
      // const authToken = AuthService.createToken(user.id, user.role);

      return ApiResponse("success", {
        token: authToken,
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        officialEmail: updatedUser.officialEmail,
        alternateEmail: updatedUser.alternateEmail,
        contactNumber: updatedUser.contactNumber,
        alternateContactNumber: updatedUser.alternateContactNumber,
        birthday: updatedUser.birthday,
        bloodGroup: updatedUser.bloodGroup,
        role: updatedUser.role,
      });
    } catch (error) {
      throw new ValidationError(error.message);
    }
  },
};

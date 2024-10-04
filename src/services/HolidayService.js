const { NotFoundError } = require("../exceptions");
const { ApiResponse } = require("../utils/ApiHelper");
const { TABLE_NAMES } = require("../utils/db");
const {
  insertRecord,
  getRecordsByKey,
  updateRecordsByKey,
  getRecordByKey,
} = require("../utils/QueryBuilder");

module.exports.HolidayService = {
  createHoliday: async (name, date) => {
    try {
      const holiday = await insertRecord(TABLE_NAMES.HOLIDAY, {
        name: name,
        date: date,
      });
      if (!holiday) {
        throw new Error("Error creating holiday!!");
      }
      return ApiResponse("success", holiday);
    } catch (error) {
      throw new Error("Error creating holiday:" + error.message);
    }
  },
  getHolidays: async (q, { page, limit }) => {
    try {
      const skip = (page - 1) * limit;
      const searchQuery = {};

      if (q) {
        searchQuery["$or"] = [{ name: { $regex: q, $options: "i" } }];
      }

      const records = await getRecordsByKey(TABLE_NAMES.HOLIDAY, searchQuery, {
        limit,
        skip,
        sortField: "date",
        sortOrder: "asc",
      });

      const totalRecords = await TABLE_NAMES.HOLIDAY.countDocuments(
        searchQuery
      );

      return {
        holidays: records,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new Error("Error Fetching holidays:" + error.message);
    }
  },

  getHolidayByID: async (holidayId) => {
    try {
      const holiday = await getRecordByKey(TABLE_NAMES.HOLIDAY, {
        _id: holidayId,
      });
      if (!holiday) {
        throw new Error("Record not Found");
      }
      return holiday;
    } catch (error) {
      throw new NotFoundError(error.message);
    }
  },

  updateHoliday: async (id, { name, date }) => {
    try {
      const updatedHoliday = await updateRecordsByKey(
        TABLE_NAMES.HOLIDAY,
        { _id: id },
        { name, date }
      );

      if (!updatedHoliday) {
        throw new Error("Error updating holiday!!");
      }

      return {
        name: updatedHoliday.name,
        date: updatedHoliday.date,
        _id: updatedHoliday._id,
      };
    } catch (error) {
      throw new Error("Error updating Holiday:" + error.message);
    }
  },
};

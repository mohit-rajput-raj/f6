import pandas as pd



def create_AttandanceFile(  df):
  days = [col for col in df.columns if col not in ["Enrollment_No", "Name"]]
  attendance = []
  for i in range(len(df)):
      name = df.loc[i, "Name"]
      present_count = sum(df.loc[i, day] == "P" for day in days)
      attendance.append({"Name": name, "Present_Count": present_count})

  def find_AllAbsent(df, days):
      all_absent_days = []
      for day in days:
          if all(df[day] == "A"):
              all_absent_days.append(day)
      return all_absent_days

  absent_days = find_AllAbsent(df, days)
  print("Days when all students were absent:", absent_days)

  totalClasses = len(days) - len(absent_days)

  def attendance_percentage(attendance, totalClasses):
      for record in attendance:
          record["TotalClasses"] = totalClasses
          record["Percentage"] = round((record["Present_Count"] / totalClasses) * 100, 2)
      return attendance

  attendance = attendance_percentage(attendance, totalClasses)

  attendance_df = pd.DataFrame(attendance)
  return attendance_df
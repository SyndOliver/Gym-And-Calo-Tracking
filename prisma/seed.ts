import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";

if (existsSync(join(process.cwd(), ".env"))) {
  config({ path: join(process.cwd(), ".env") });
}

const prisma = new PrismaClient();

// videoUrl: ID YouTube 11 ký tự hoặc full URL. Lib parseVideoUrl tự nhận dạng.
// Đa số lấy từ các kênh uy tín: Athlean-X, Jeff Nippard, Renaissance Periodization, Alan Thrall...
const exercises = [
  // ============ NGỰC (CHEST) ============
  { name: "Bench Press (Tạ đòn)", nameEn: "Barbell Bench Press", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "barbell", videoUrl: "vcBig73ojpE" },
  { name: "Incline Bench Press", nameEn: "Incline Barbell Press", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "barbell", videoUrl: "SrqOu55lrYU" },
  { name: "Decline Bench Press", nameEn: "Decline Barbell Press", muscleGroup: "chest", primaryMuscle: "Ngực dưới", equipment: "barbell", videoUrl: "LfyQBUKR8SE" },
  { name: "Dumbbell Bench Press", nameEn: "Dumbbell Bench Press", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "dumbbell", videoUrl: "VmB1G1K7v94" },
  { name: "Incline Dumbbell Press", nameEn: "Incline Dumbbell Press", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "dumbbell", videoUrl: "8iPEnn-ltC8" },
  { name: "Dumbbell Fly (Đẩy ngang)", nameEn: "Dumbbell Fly", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "dumbbell", videoUrl: "eozdVDA78K0" },
  { name: "Cable Crossover", nameEn: "Cable Crossover", muscleGroup: "chest", primaryMuscle: "Ngực", equipment: "cable", videoUrl: "taI4XduLpTk" },
  { name: "Push-up (Hít đất)", nameEn: "Push-up", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "bodyweight", videoUrl: "IODxDxX7oi4" },
  { name: "Dips (Xà kép)", nameEn: "Chest Dips", muscleGroup: "chest", primaryMuscle: "Ngực dưới", equipment: "bodyweight", videoUrl: "wjUmnZH528Y" },
  { name: "Pec Deck Machine", nameEn: "Pec Deck Machine", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "machine", videoUrl: "xUm0BiZCWlQ" },

  // ============ LƯNG (BACK) ============
  { name: "Deadlift (Tạ chết)", nameEn: "Deadlift", muscleGroup: "back", primaryMuscle: "Lưng dưới + toàn thân", equipment: "barbell", videoUrl: "AweC3UaM14o" },
  { name: "Pull-up (Xà đơn)", nameEn: "Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô", equipment: "bodyweight", videoUrl: "eGo4IYlbE5g" },
  { name: "Chin-up", nameEn: "Chin-up", muscleGroup: "back", primaryMuscle: "Lưng xô + Tay trước", equipment: "bodyweight", videoUrl: "brhRXlOhsAM" },
  { name: "Lat Pulldown (Kéo xô)", nameEn: "Lat Pulldown", muscleGroup: "back", primaryMuscle: "Lưng xô", equipment: "cable", videoUrl: "CAwf7n6Luuc" },
  { name: "Barbell Row (Chèo tạ đòn)", nameEn: "Barbell Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "barbell", videoUrl: "FWJR5Ve8bnQ" },
  { name: "Dumbbell Row (Chèo tạ đơn)", nameEn: "Dumbbell Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "dumbbell", videoUrl: "DMo3HJoawrU" },
  { name: "T-Bar Row", nameEn: "T-Bar Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "barbell", videoUrl: "j3Igk5nyZE4" },
  { name: "Seated Cable Row (Chèo cáp ngồi)", nameEn: "Seated Cable Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "cable", videoUrl: "GZbfZ033f74" },
  { name: "Face Pull", nameEn: "Face Pull", muscleGroup: "back", primaryMuscle: "Lưng trên + Vai sau", equipment: "cable", videoUrl: "rep-qVOkqgk" },
  { name: "Hyperextension (Lưng dưới)", nameEn: "Back Extension", muscleGroup: "back", primaryMuscle: "Lưng dưới", equipment: "bodyweight", videoUrl: "ph3pddpKzzw" },

  // ============ CHÂN (LEGS) ============
  { name: "Squat (Tạ đòn)", nameEn: "Barbell Back Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước + Mông", equipment: "barbell", videoUrl: "ultWZbUMPL8" },
  { name: "Front Squat", nameEn: "Front Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "barbell", videoUrl: "tlfahNdNPPI" },
  { name: "Romanian Deadlift (RDL)", nameEn: "Romanian Deadlift", muscleGroup: "legs", primaryMuscle: "Đùi sau + Mông", equipment: "barbell", videoUrl: "JCXUYuzwNrM" },
  { name: "Leg Press (Đạp chân)", nameEn: "Leg Press", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "machine", videoUrl: "IZxyjW7MPJQ" },
  { name: "Leg Extension (Duỗi chân)", nameEn: "Leg Extension", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "machine", videoUrl: "YyvSfVjQeL0" },
  { name: "Leg Curl (Cuộn chân)", nameEn: "Leg Curl", muscleGroup: "legs", primaryMuscle: "Đùi sau", equipment: "machine", videoUrl: "1Tq3QdYUuHs" },
  { name: "Bulgarian Split Squat", nameEn: "Bulgarian Split Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước + Mông", equipment: "dumbbell", videoUrl: "2C-uNgKwPLE" },
  { name: "Lunges (Chùng chân)", nameEn: "Walking Lunges", muscleGroup: "legs", primaryMuscle: "Đùi + Mông", equipment: "dumbbell", videoUrl: "L8fvypPrzzs" },
  { name: "Hip Thrust", nameEn: "Hip Thrust", muscleGroup: "legs", primaryMuscle: "Mông", equipment: "barbell", videoUrl: "LM8XHLYJoYs" },
  { name: "Calf Raise (Bắp chuối)", nameEn: "Standing Calf Raise", muscleGroup: "legs", primaryMuscle: "Bắp chuối", equipment: "machine", videoUrl: "gwLzBJYoWlI" },
  { name: "Goblet Squat", nameEn: "Goblet Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "dumbbell", videoUrl: "MeIiIdhvXT4" },

  // ============ VAI (SHOULDERS) ============
  { name: "Overhead Press (OHP)", nameEn: "Overhead Press", muscleGroup: "shoulders", primaryMuscle: "Vai trước", equipment: "barbell", videoUrl: "2yjwXTZQDDI" },
  { name: "Dumbbell Shoulder Press", nameEn: "Dumbbell Shoulder Press", muscleGroup: "shoulders", primaryMuscle: "Vai trước/giữa", equipment: "dumbbell", videoUrl: "qEwKCR5JCog" },
  { name: "Arnold Press", nameEn: "Arnold Press", muscleGroup: "shoulders", primaryMuscle: "Vai", equipment: "dumbbell", videoUrl: "3ml7BH7mNwQ" },
  { name: "Lateral Raise (Vai ngang)", nameEn: "Lateral Raise", muscleGroup: "shoulders", primaryMuscle: "Vai giữa", equipment: "dumbbell", videoUrl: "3VcKaXpzqRo" },
  { name: "Front Raise (Vai trước)", nameEn: "Front Raise", muscleGroup: "shoulders", primaryMuscle: "Vai trước", equipment: "dumbbell", videoUrl: "-t7fuZ0KhDA" },
  { name: "Rear Delt Fly (Vai sau)", nameEn: "Rear Delt Fly", muscleGroup: "shoulders", primaryMuscle: "Vai sau", equipment: "dumbbell", videoUrl: "EA7u4Q_8HQ0" },
  { name: "Upright Row", nameEn: "Upright Row", muscleGroup: "shoulders", primaryMuscle: "Vai giữa + Cầu vai", equipment: "barbell", videoUrl: "Vk_DHwk8ucU" },
  { name: "Shrug (Cầu vai)", nameEn: "Barbell Shrug", muscleGroup: "shoulders", primaryMuscle: "Cầu vai", equipment: "barbell", videoUrl: "g6qbq4Lf1FI" },
  { name: "Cable Lateral Raise", nameEn: "Cable Lateral Raise", muscleGroup: "shoulders", primaryMuscle: "Vai giữa", equipment: "cable", videoUrl: "Z5FA9aq3L6A" },

  // ============ TAY (ARMS) ============
  { name: "Barbell Curl (Cuộn tạ đòn)", nameEn: "Barbell Curl", muscleGroup: "arms", primaryMuscle: "Tay trước (Biceps)", equipment: "barbell", videoUrl: "kwG2ipFRgfo" },
  { name: "Dumbbell Curl", nameEn: "Dumbbell Curl", muscleGroup: "arms", primaryMuscle: "Tay trước (Biceps)", equipment: "dumbbell", videoUrl: "ykJmrZ5v0Oo" },
  { name: "Hammer Curl", nameEn: "Hammer Curl", muscleGroup: "arms", primaryMuscle: "Tay trước + Cẳng tay", equipment: "dumbbell", videoUrl: "zC3nLlEvin4" },
  { name: "Preacher Curl", nameEn: "Preacher Curl", muscleGroup: "arms", primaryMuscle: "Tay trước (Biceps)", equipment: "barbell", videoUrl: "fIWP-FRFNU0" },
  { name: "Concentration Curl", nameEn: "Concentration Curl", muscleGroup: "arms", primaryMuscle: "Tay trước", equipment: "dumbbell", videoUrl: "0AUGkch3tGc" },
  { name: "Cable Curl", nameEn: "Cable Curl", muscleGroup: "arms", primaryMuscle: "Tay trước", equipment: "cable", videoUrl: "85ZeGXn7IY4" },
  { name: "Tricep Pushdown (Đẩy tô tay sau)", nameEn: "Tricep Pushdown", muscleGroup: "arms", primaryMuscle: "Tay sau (Triceps)", equipment: "cable", videoUrl: "2-LAMcpzODU" },
  { name: "Skull Crusher", nameEn: "Lying Tricep Extension", muscleGroup: "arms", primaryMuscle: "Tay sau (Triceps)", equipment: "barbell", videoUrl: "d_KZxkY_0cM" },
  { name: "Overhead Tricep Extension", nameEn: "Overhead Tricep Extension", muscleGroup: "arms", primaryMuscle: "Tay sau (Triceps)", equipment: "dumbbell", videoUrl: "_gsUck-7M74" },
  { name: "Close-Grip Bench Press", nameEn: "Close-Grip Bench Press", muscleGroup: "arms", primaryMuscle: "Tay sau + Ngực", equipment: "barbell", videoUrl: "nEF0bv2FW94" },
  { name: "Tricep Dips", nameEn: "Tricep Dips", muscleGroup: "arms", primaryMuscle: "Tay sau", equipment: "bodyweight", videoUrl: "0326dy_-CzM" },
  { name: "Wrist Curl (Cẳng tay)", nameEn: "Wrist Curl", muscleGroup: "arms", primaryMuscle: "Cẳng tay", equipment: "dumbbell", videoUrl: "Jeho2czdwqs" },

  // ============ BỤNG / CORE ============
  { name: "Plank", nameEn: "Plank", muscleGroup: "core", primaryMuscle: "Toàn bộ core", equipment: "bodyweight", videoUrl: "ASdvN_XEl_c" },
  { name: "Crunches (Gập bụng)", nameEn: "Crunches", muscleGroup: "core", primaryMuscle: "Bụng trên", equipment: "bodyweight", videoUrl: "Xyd_fa5zoEU" },
  { name: "Sit-up", nameEn: "Sit-up", muscleGroup: "core", primaryMuscle: "Bụng", equipment: "bodyweight", videoUrl: "1fbU_MkV7NE" },
  { name: "Leg Raise (Nâng chân)", nameEn: "Hanging Leg Raise", muscleGroup: "core", primaryMuscle: "Bụng dưới", equipment: "bodyweight", videoUrl: "Pr1ieGZ5atk" },
  { name: "Russian Twist", nameEn: "Russian Twist", muscleGroup: "core", primaryMuscle: "Bụng xiên", equipment: "bodyweight", videoUrl: "wkD8rjkodUI" },
  { name: "Cable Crunch", nameEn: "Cable Crunch", muscleGroup: "core", primaryMuscle: "Bụng", equipment: "cable", videoUrl: "f6S5s6Hm-WY" },
  { name: "Mountain Climber", nameEn: "Mountain Climber", muscleGroup: "core", primaryMuscle: "Bụng + Toàn thân", equipment: "bodyweight", videoUrl: "nmwgirgXLYM" },
  { name: "Side Plank", nameEn: "Side Plank", muscleGroup: "core", primaryMuscle: "Bụng xiên", equipment: "bodyweight", videoUrl: "K2VljzCC16g" },
  { name: "Ab Wheel Rollout", nameEn: "Ab Wheel Rollout", muscleGroup: "core", primaryMuscle: "Bụng", equipment: "bodyweight", videoUrl: "JF_3wdEYpwQ" },

  // ============ CARDIO ============
  { name: "Chạy bộ", nameEn: "Running", muscleGroup: "cardio", primaryMuscle: "Tim mạch", equipment: "bodyweight", category: "cardio", videoUrl: "_kGESn8ArrU" },
  { name: "Đạp xe", nameEn: "Cycling", muscleGroup: "cardio", primaryMuscle: "Tim mạch + Chân", equipment: "machine", category: "cardio", videoUrl: null },
  { name: "Máy chạy bộ", nameEn: "Treadmill", muscleGroup: "cardio", primaryMuscle: "Tim mạch", equipment: "machine", category: "cardio", videoUrl: null },
  { name: "Máy elliptical", nameEn: "Elliptical", muscleGroup: "cardio", primaryMuscle: "Tim mạch", equipment: "machine", category: "cardio", videoUrl: null },
  { name: "Nhảy dây", nameEn: "Jump Rope", muscleGroup: "cardio", primaryMuscle: "Tim mạch + Bắp chuối", equipment: "bodyweight", category: "cardio", videoUrl: "1BZM2Vre5oc" },
  { name: "Burpee", nameEn: "Burpee", muscleGroup: "cardio", primaryMuscle: "Toàn thân", equipment: "bodyweight", category: "cardio", videoUrl: "TU8QYVW0gDU" },
  { name: "Rowing Machine (Máy chèo)", nameEn: "Rowing Machine", muscleGroup: "cardio", primaryMuscle: "Tim mạch + Lưng", equipment: "machine", category: "cardio", videoUrl: "S7HEm-fd534" },

  // ============================================================
  // ===== EXTENSION PACK V2 - Thêm đa dạng & biến thể =========
  // ============================================================

  // ===== NGỰC mở rộng =====
  { name: "Incline Dumbbell Fly", nameEn: "Incline Dumbbell Fly", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "dumbbell", videoUrl: "DiBqDDvfLfA" },
  { name: "Cable Fly thấp lên cao (Low to High)", nameEn: "Low to High Cable Fly", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "cable", videoUrl: "Iwe6AmxVf7o" },
  { name: "Cable Fly cao xuống thấp (High to Low)", nameEn: "High to Low Cable Fly", muscleGroup: "chest", primaryMuscle: "Ngực dưới", equipment: "cable", videoUrl: "dkxBNxAOpzY" },
  { name: "Smith Machine Bench Press", nameEn: "Smith Machine Bench Press", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "machine", videoUrl: "lAnQRO3mJhg" },
  { name: "Floor Press", nameEn: "Floor Press", muscleGroup: "chest", primaryMuscle: "Ngực + Tay sau", equipment: "barbell", videoUrl: "jfu8WjnQE4o" },
  { name: "Dumbbell Pullover", nameEn: "Dumbbell Pullover", muscleGroup: "chest", primaryMuscle: "Ngực + Lưng xô", equipment: "dumbbell", videoUrl: "g60-mEIa3oU" },
  { name: "Diamond Push-up (Hít kim cương)", nameEn: "Diamond Push-up", muscleGroup: "chest", primaryMuscle: "Ngực giữa + Tay sau", equipment: "bodyweight", videoUrl: "J0DnG1_S92I" },
  { name: "Decline Push-up (Hít kê chân cao)", nameEn: "Decline Push-up", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "bodyweight", videoUrl: "SKPab2YC8BE" },
  { name: "Incline Push-up (Hít kê tay cao)", nameEn: "Incline Push-up", muscleGroup: "chest", primaryMuscle: "Ngực dưới", equipment: "bodyweight", videoUrl: "4dF1DOWzf20" },
  { name: "Landmine Press (Ngực)", nameEn: "Landmine Press", muscleGroup: "chest", primaryMuscle: "Ngực trên + Vai", equipment: "barbell", videoUrl: "9VuNGcjcK0o" },
  { name: "Svend Press (Đẩy đĩa)", nameEn: "Svend Press", muscleGroup: "chest", primaryMuscle: "Ngực trong", equipment: "barbell", videoUrl: null },

  // ===== LƯNG mở rộng =====
  { name: "Wide-Grip Pull-up (Xà đơn rộng)", nameEn: "Wide-Grip Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô (rộng)", equipment: "bodyweight", videoUrl: "GZbfZ033f74" },
  { name: "Neutral Grip Pull-up", nameEn: "Neutral Grip Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô + Tay trước", equipment: "bodyweight", videoUrl: "FDUkuXNDzpk" },
  { name: "Inverted Row (Chèo úp người)", nameEn: "Inverted Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "bodyweight", videoUrl: "KOaCM1HMwU8" },
  { name: "Pendlay Row", nameEn: "Pendlay Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "barbell", videoUrl: "vXgyaZTeYL4" },
  { name: "Meadows Row", nameEn: "Meadows Row", muscleGroup: "back", primaryMuscle: "Lưng giữa + Xô", equipment: "barbell", videoUrl: "v3lvUg45oM4" },
  { name: "Single Arm Cable Row", nameEn: "Single Arm Cable Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "cable", videoUrl: "9efgcAjQe7E" },
  { name: "Straight Arm Pulldown", nameEn: "Straight Arm Pulldown", muscleGroup: "back", primaryMuscle: "Lưng xô", equipment: "cable", videoUrl: "y4tcAYQRivg" },
  { name: "Rack Pull", nameEn: "Rack Pull", muscleGroup: "back", primaryMuscle: "Lưng dưới + Cầu vai", equipment: "barbell", videoUrl: "06ZYAlnjFzo" },
  { name: "Sumo Deadlift", nameEn: "Sumo Deadlift", muscleGroup: "back", primaryMuscle: "Lưng dưới + Mông", equipment: "barbell", videoUrl: "wYREQkVtvEc" },
  { name: "Trap Bar Deadlift", nameEn: "Trap Bar Deadlift", muscleGroup: "back", primaryMuscle: "Toàn thân", equipment: "barbell", videoUrl: "qZjUuM89LMA" },
  { name: "Snatch Grip Deadlift", nameEn: "Snatch Grip Deadlift", muscleGroup: "back", primaryMuscle: "Lưng trên + Toàn thân", equipment: "barbell", videoUrl: "_mWxV9-KMOI" },
  { name: "Good Morning", nameEn: "Good Morning", muscleGroup: "back", primaryMuscle: "Lưng dưới + Đùi sau", equipment: "barbell", videoUrl: "vKPGe8zb2S0" },
  { name: "Kettlebell Swing", nameEn: "Kettlebell Swing", muscleGroup: "back", primaryMuscle: "Lưng dưới + Mông", equipment: "kettlebell", videoUrl: "cKx8XE6a3WA" },
  { name: "Chest Supported Row (Máy)", nameEn: "Chest Supported Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "machine", videoUrl: "rUYVGyVnvaM" },
  { name: "Renegade Row", nameEn: "Renegade Row", muscleGroup: "back", primaryMuscle: "Lưng + Core", equipment: "dumbbell", videoUrl: "CXVMs0PfwPo" },

  // ===== CHÂN mở rộng =====
  { name: "High Bar Squat", nameEn: "High Bar Back Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước + Mông", equipment: "barbell", videoUrl: "yMxDi8e3mTo" },
  { name: "Box Squat", nameEn: "Box Squat", muscleGroup: "legs", primaryMuscle: "Mông + Đùi sau", equipment: "barbell", videoUrl: "yEulRnfwbZc" },
  { name: "Pause Squat (Squat ngừng giữa)", nameEn: "Pause Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "barbell", videoUrl: "wY32Wn9oRnc" },
  { name: "Hack Squat (Máy)", nameEn: "Hack Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "machine", videoUrl: "0tn5K9NlCfo" },
  { name: "Smith Machine Squat", nameEn: "Smith Machine Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "machine", videoUrl: "k9npBmytcXQ" },
  { name: "Belt Squat", nameEn: "Belt Squat", muscleGroup: "legs", primaryMuscle: "Đùi + Mông (giảm tải lưng)", equipment: "machine", videoUrl: "_kMSQfm6T9c" },
  { name: "Step-up (Bước lên bục)", nameEn: "Step-up", muscleGroup: "legs", primaryMuscle: "Đùi + Mông", equipment: "dumbbell", videoUrl: "5VEh7nWDlJM" },
  { name: "Sissy Squat", nameEn: "Sissy Squat", muscleGroup: "legs", primaryMuscle: "Đùi trước", equipment: "bodyweight", videoUrl: "DXMzXHJ4FLA" },
  { name: "Single Leg Press", nameEn: "Single Leg Press", muscleGroup: "legs", primaryMuscle: "Đùi trước (1 chân)", equipment: "machine", videoUrl: "SPYg7slWXfY" },
  { name: "Glute Bridge", nameEn: "Glute Bridge", muscleGroup: "legs", primaryMuscle: "Mông", equipment: "bodyweight", videoUrl: "wPM8icPu6H8" },
  { name: "Single Leg RDL", nameEn: "Single Leg Romanian Deadlift", muscleGroup: "legs", primaryMuscle: "Đùi sau + Mông + Cân bằng", equipment: "dumbbell", videoUrl: "FuxOcptUHGM" },
  { name: "Cable Pull-through", nameEn: "Cable Pull-through", muscleGroup: "legs", primaryMuscle: "Mông + Đùi sau", equipment: "cable", videoUrl: "y4o0PcyRzXM" },
  { name: "Adductor Machine (Khép đùi)", nameEn: "Hip Adductor Machine", muscleGroup: "legs", primaryMuscle: "Đùi trong", equipment: "machine", videoUrl: "Ku4VZIAJgnc" },
  { name: "Abductor Machine (Dạng đùi)", nameEn: "Hip Abductor Machine", muscleGroup: "legs", primaryMuscle: "Mông ngoài", equipment: "machine", videoUrl: "9NxWWLLknmA" },
  { name: "Seated Calf Raise (Bắp chuối ngồi)", nameEn: "Seated Calf Raise", muscleGroup: "legs", primaryMuscle: "Bắp chuối (Soleus)", equipment: "machine", videoUrl: "JbyjNymZOt0" },
  { name: "Donkey Calf Raise", nameEn: "Donkey Calf Raise", muscleGroup: "legs", primaryMuscle: "Bắp chuối", equipment: "machine", videoUrl: "fPmiL2KgnkY" },
  { name: "Reverse Lunge", nameEn: "Reverse Lunge", muscleGroup: "legs", primaryMuscle: "Đùi + Mông", equipment: "dumbbell", videoUrl: "xrPteyQlPvU" },
  { name: "Curtsy Lunge", nameEn: "Curtsy Lunge", muscleGroup: "legs", primaryMuscle: "Mông + Đùi", equipment: "dumbbell", videoUrl: "3WqgJVcCMEE" },
  { name: "Pistol Squat (Squat 1 chân)", nameEn: "Pistol Squat", muscleGroup: "legs", primaryMuscle: "Đùi + Cân bằng", equipment: "bodyweight", videoUrl: "qDcniqddTeE" },

  // ===== VAI mở rộng =====
  { name: "Push Press", nameEn: "Push Press", muscleGroup: "shoulders", primaryMuscle: "Vai + Toàn thân", equipment: "barbell", videoUrl: "iaBVSJm78ko" },
  { name: "Z-Press (Ngồi đẩy tạ)", nameEn: "Z-Press", muscleGroup: "shoulders", primaryMuscle: "Vai + Core", equipment: "barbell", videoUrl: "BnxOZ-OphCM" },
  { name: "Behind the Neck Press", nameEn: "Behind the Neck Press", muscleGroup: "shoulders", primaryMuscle: "Vai sau", equipment: "barbell", videoUrl: "u-NIgIqbFDA" },
  { name: "Machine Shoulder Press", nameEn: "Machine Shoulder Press", muscleGroup: "shoulders", primaryMuscle: "Vai trước/giữa", equipment: "machine", videoUrl: "Wqq43dKW1TU" },
  { name: "Reverse Pec Deck (Vai sau máy)", nameEn: "Reverse Pec Deck", muscleGroup: "shoulders", primaryMuscle: "Vai sau", equipment: "machine", videoUrl: "6yMdhi2DVao" },
  { name: "Cable Y-Raise", nameEn: "Cable Y-Raise", muscleGroup: "shoulders", primaryMuscle: "Vai sau + Lưng trên", equipment: "cable", videoUrl: "_OzlMCS3CQM" },
  { name: "Plate Front Raise", nameEn: "Plate Front Raise", muscleGroup: "shoulders", primaryMuscle: "Vai trước", equipment: "barbell", videoUrl: "i23s6YApvJk" },
  { name: "Dumbbell Shrug", nameEn: "Dumbbell Shrug", muscleGroup: "shoulders", primaryMuscle: "Cầu vai", equipment: "dumbbell", videoUrl: "g6qbq4Lf1FI" },
  { name: "Landmine Press (Vai)", nameEn: "Landmine Shoulder Press", muscleGroup: "shoulders", primaryMuscle: "Vai trước", equipment: "barbell", videoUrl: "9VuNGcjcK0o" },
  { name: "Single Arm Lateral Raise (Cáp)", nameEn: "Single Arm Cable Lateral", muscleGroup: "shoulders", primaryMuscle: "Vai giữa", equipment: "cable", videoUrl: "Z5FA9aq3L6A" },

  // ===== TAY mở rộng =====
  { name: "Spider Curl", nameEn: "Spider Curl", muscleGroup: "arms", primaryMuscle: "Tay trước (đỉnh peak)", equipment: "dumbbell", videoUrl: "qBI7eIbdacc" },
  { name: "Drag Curl", nameEn: "Drag Curl", muscleGroup: "arms", primaryMuscle: "Tay trước", equipment: "barbell", videoUrl: "wokt7SJgwbA" },
  { name: "Reverse Curl (Cuộn tay ngược)", nameEn: "Reverse Curl", muscleGroup: "arms", primaryMuscle: "Cẳng tay + Tay trước", equipment: "barbell", videoUrl: "nRgxYX2Ve9w" },
  { name: "EZ Bar Curl", nameEn: "EZ Bar Curl", muscleGroup: "arms", primaryMuscle: "Tay trước", equipment: "barbell", videoUrl: "U8KkHhjLOSk" },
  { name: "Incline Dumbbell Curl", nameEn: "Incline Dumbbell Curl", muscleGroup: "arms", primaryMuscle: "Tay trước (cơ dài)", equipment: "dumbbell", videoUrl: "soxrZlIl35U" },
  { name: "Zottman Curl", nameEn: "Zottman Curl", muscleGroup: "arms", primaryMuscle: "Tay trước + Cẳng tay", equipment: "dumbbell", videoUrl: "ZrpRBgswtHs" },
  { name: "Cable Hammer Curl (Dây thừng)", nameEn: "Cable Rope Hammer Curl", muscleGroup: "arms", primaryMuscle: "Tay trước + Cẳng tay", equipment: "cable", videoUrl: "9JOgrTyM4Aw" },
  { name: "21s (Curl 21 reps)", nameEn: "21s Bicep Curl", muscleGroup: "arms", primaryMuscle: "Tay trước", equipment: "barbell", videoUrl: "GjA0nx_GYlk" },
  { name: "Rope Tricep Pushdown", nameEn: "Rope Tricep Pushdown", muscleGroup: "arms", primaryMuscle: "Tay sau", equipment: "cable", videoUrl: "kiuVA0gs3EI" },
  { name: "Single Arm Tricep Pushdown", nameEn: "Single Arm Tricep Pushdown", muscleGroup: "arms", primaryMuscle: "Tay sau (1 tay)", equipment: "cable", videoUrl: "5_RVKMl6PYM" },
  { name: "Tricep Kickback", nameEn: "Tricep Kickback", muscleGroup: "arms", primaryMuscle: "Tay sau", equipment: "dumbbell", videoUrl: "ZEbcQ1bCkpc" },
  { name: "JM Press", nameEn: "JM Press", muscleGroup: "arms", primaryMuscle: "Tay sau", equipment: "barbell", videoUrl: "B-6Es76yPxc" },
  { name: "Cable Overhead Tricep Extension", nameEn: "Cable Overhead Tricep Extension", muscleGroup: "arms", primaryMuscle: "Tay sau (đầu dài)", equipment: "cable", videoUrl: "_gsUck-7M74" },
  { name: "Reverse Wrist Curl", nameEn: "Reverse Wrist Curl", muscleGroup: "arms", primaryMuscle: "Cẳng tay (mặt trên)", equipment: "dumbbell", videoUrl: "AUpJUuq1q4Y" },
  { name: "Wrist Roller", nameEn: "Wrist Roller", muscleGroup: "arms", primaryMuscle: "Cẳng tay", equipment: "bodyweight", videoUrl: "knvD_NeCbcA" },
  { name: "Bench Dips (Hít xà ghế)", nameEn: "Bench Dips", muscleGroup: "arms", primaryMuscle: "Tay sau", equipment: "bodyweight", videoUrl: "0326dy_-CzM" },

  // ===== BỤNG / CORE mở rộng =====
  { name: "Dead Bug", nameEn: "Dead Bug", muscleGroup: "core", primaryMuscle: "Bụng trong (TVA)", equipment: "bodyweight", videoUrl: "g_BYB0R-4Ws" },
  { name: "Bird Dog", nameEn: "Bird Dog", muscleGroup: "core", primaryMuscle: "Core + Lưng dưới", equipment: "bodyweight", videoUrl: "wiFNA3sqjCA" },
  { name: "V-Up", nameEn: "V-Up", muscleGroup: "core", primaryMuscle: "Bụng (toàn bộ)", equipment: "bodyweight", videoUrl: "7UVgs18Y1P4" },
  { name: "Toes to Bar", nameEn: "Toes to Bar", muscleGroup: "core", primaryMuscle: "Bụng dưới + Xô", equipment: "bodyweight", videoUrl: "_03pCKOv4l4" },
  { name: "Dragon Flag", nameEn: "Dragon Flag", muscleGroup: "core", primaryMuscle: "Toàn bộ core", equipment: "bodyweight", videoUrl: "pvz7k7m_AMc" },
  { name: "Hollow Hold", nameEn: "Hollow Body Hold", muscleGroup: "core", primaryMuscle: "Bụng + Hông", equipment: "bodyweight", videoUrl: "44ScXWFaVBs" },
  { name: "Pallof Press", nameEn: "Pallof Press", muscleGroup: "core", primaryMuscle: "Bụng chống xoay", equipment: "cable", videoUrl: "xa1iwAeeBOI" },
  { name: "Wood Chop (Cáp)", nameEn: "Cable Wood Chop", muscleGroup: "core", primaryMuscle: "Bụng xiên", equipment: "cable", videoUrl: "rmoX_TmRb4U" },
  { name: "Bicycle Crunch", nameEn: "Bicycle Crunch", muscleGroup: "core", primaryMuscle: "Bụng + Bụng xiên", equipment: "bodyweight", videoUrl: "9FGilxCbdz8" },
  { name: "Reverse Crunch", nameEn: "Reverse Crunch", muscleGroup: "core", primaryMuscle: "Bụng dưới", equipment: "bodyweight", videoUrl: "hyvVKCm6jIA" },
  { name: "Hanging Knee Raise", nameEn: "Hanging Knee Raise", muscleGroup: "core", primaryMuscle: "Bụng dưới", equipment: "bodyweight", videoUrl: "Pr1ieGZ5atk" },
  { name: "Standing Cable Twist", nameEn: "Standing Cable Twist", muscleGroup: "core", primaryMuscle: "Bụng xiên", equipment: "cable", videoUrl: "5Kk2I5JAr_o" },
  { name: "Windshield Wiper", nameEn: "Windshield Wiper", muscleGroup: "core", primaryMuscle: "Bụng xiên + dưới", equipment: "bodyweight", videoUrl: "iLA4bFP3y8U" },
  { name: "L-Sit", nameEn: "L-Sit Hold", muscleGroup: "core", primaryMuscle: "Bụng + Hông + Vai", equipment: "bodyweight", videoUrl: "IJgpO6yKSyE" },

  // ===== CARDIO mở rộng =====
  { name: "Stair Climber (Máy leo cầu thang)", nameEn: "Stair Climber", muscleGroup: "cardio", primaryMuscle: "Tim + Chân", equipment: "machine", category: "cardio", videoUrl: null },
  { name: "Air Bike (Assault Bike)", nameEn: "Assault Bike", muscleGroup: "cardio", primaryMuscle: "Toàn thân + Tim", equipment: "machine", category: "cardio", videoUrl: "7AZyeoFGpUo" },
  { name: "Battle Ropes", nameEn: "Battle Ropes", muscleGroup: "cardio", primaryMuscle: "Toàn thân + Vai", equipment: "bodyweight", category: "cardio", videoUrl: "C3LEGQS0Eag" },
  { name: "Box Jumps", nameEn: "Box Jumps", muscleGroup: "cardio", primaryMuscle: "Chân + Bùng nổ", equipment: "bodyweight", category: "cardio", videoUrl: "52r_Ul5k03g" },
  { name: "Sled Push", nameEn: "Sled Push", muscleGroup: "cardio", primaryMuscle: "Chân + Toàn thân", equipment: "machine", category: "cardio", videoUrl: "JxLCN1cb-Mw" },
  { name: "Sled Pull", nameEn: "Sled Pull", muscleGroup: "cardio", primaryMuscle: "Lưng + Chân", equipment: "machine", category: "cardio", videoUrl: "yXz0_0BWEFE" },
  { name: "Đi bộ nhanh (Walking)", nameEn: "Walking", muscleGroup: "cardio", primaryMuscle: "Tim mạch", equipment: "bodyweight", category: "cardio", videoUrl: null },

  // ===== TOÀN THÂN / OLYMPIC LIFTS =====
  { name: "Power Clean", nameEn: "Power Clean", muscleGroup: "fullbody", primaryMuscle: "Toàn thân (bùng nổ)", equipment: "barbell", videoUrl: "KwYJTpQ_x5A" },
  { name: "Clean and Jerk", nameEn: "Clean and Jerk", muscleGroup: "fullbody", primaryMuscle: "Toàn thân", equipment: "barbell", videoUrl: "PdvHaQqVvkw" },
  { name: "Snatch", nameEn: "Snatch", muscleGroup: "fullbody", primaryMuscle: "Toàn thân", equipment: "barbell", videoUrl: "9xQp2sldyts" },
  { name: "Thruster (Squat + Press)", nameEn: "Thruster", muscleGroup: "fullbody", primaryMuscle: "Chân + Vai", equipment: "barbell", videoUrl: "L219ltL15zk" },
  { name: "Turkish Get-up", nameEn: "Turkish Get-up", muscleGroup: "fullbody", primaryMuscle: "Toàn thân + Vai + Core", equipment: "kettlebell", videoUrl: "0bWRPC49-KI" },
  { name: "Farmer's Walk (Đi xách tạ)", nameEn: "Farmer's Walk", muscleGroup: "fullbody", primaryMuscle: "Cẳng tay + Cầu vai + Core", equipment: "dumbbell", videoUrl: "Fkzk_RqlYig" },
  { name: "Man Maker", nameEn: "Man Maker", muscleGroup: "fullbody", primaryMuscle: "Toàn thân + Tim", equipment: "dumbbell", videoUrl: "DXmA3GVerEs" },

  // ===== STRETCHING / KHỞI ĐỘNG =====
  { name: "Cat-Cow Stretch", nameEn: "Cat-Cow Stretch", muscleGroup: "core", primaryMuscle: "Cột sống + Lưng", equipment: "bodyweight", category: "stretching", videoUrl: "kqnua4rHVVA" },
  { name: "Hip Flexor Stretch", nameEn: "Hip Flexor Stretch", muscleGroup: "legs", primaryMuscle: "Cơ gập hông", equipment: "bodyweight", category: "stretching", videoUrl: "YQmpO9VT2X4" },
  { name: "Pigeon Pose", nameEn: "Pigeon Pose", muscleGroup: "legs", primaryMuscle: "Mông + Hông", equipment: "bodyweight", category: "stretching", videoUrl: "0_zPqAilTqo" },
  { name: "Foam Roll Quads", nameEn: "Foam Roll Quads", muscleGroup: "legs", primaryMuscle: "Đùi trước (giãn)", equipment: "bodyweight", category: "stretching", videoUrl: "M9g_KrxAOk8" },
  { name: "Foam Roll Lưng", nameEn: "Foam Roll Back", muscleGroup: "back", primaryMuscle: "Lưng (giãn)", equipment: "bodyweight", category: "stretching", videoUrl: "kfkvyNAxJAw" },
  { name: "Shoulder Dislocates (Khởi động vai)", nameEn: "Shoulder Dislocates", muscleGroup: "shoulders", primaryMuscle: "Vai (khởi động)", equipment: "bodyweight", category: "stretching", videoUrl: "VBA8ITshtmQ" },
  { name: "World's Greatest Stretch", nameEn: "World's Greatest Stretch", muscleGroup: "fullbody", primaryMuscle: "Toàn thân (khởi động)", equipment: "bodyweight", category: "stretching", videoUrl: "QqxEZIYIXOQ" },

  // ============================================================
  // ===== EXTENSION PACK V3 - Ngực & Lưng chuyên sâu ===========
  // ============================================================

  // ===== NGỰC chuyên sâu =====
  { name: "Guillotine Press", nameEn: "Guillotine Press", muscleGroup: "chest", primaryMuscle: "Ngực trên (cô lập)", equipment: "barbell", videoUrl: "x_x4mvObG-Y" },
  { name: "Spoto Press (Dừng giữa)", nameEn: "Spoto Press", muscleGroup: "chest", primaryMuscle: "Ngực giữa (TUT)", equipment: "barbell", videoUrl: "JWifvb88Pyo" },
  { name: "Pin Press", nameEn: "Pin Press", muscleGroup: "chest", primaryMuscle: "Ngực + Tay sau (lockout)", equipment: "barbell", videoUrl: "8K_vRm-EhFo" },
  { name: "Reverse Grip Bench Press", nameEn: "Reverse Grip Bench Press", muscleGroup: "chest", primaryMuscle: "Ngực trên", equipment: "barbell", videoUrl: "qNF8kV2_Igs" },
  { name: "Squeeze Press (Đẩy ép tạ)", nameEn: "Dumbbell Squeeze Press", muscleGroup: "chest", primaryMuscle: "Ngực trong", equipment: "dumbbell", videoUrl: "nwiXp3UB-rE" },
  { name: "Hex Press / Crush Grip Press", nameEn: "Crush Grip DB Press", muscleGroup: "chest", primaryMuscle: "Ngực trong", equipment: "dumbbell", videoUrl: "IXvU8z3GdNg" },
  { name: "Single Arm Dumbbell Press", nameEn: "Single Arm DB Bench Press", muscleGroup: "chest", primaryMuscle: "Ngực + Core chống xoay", equipment: "dumbbell", videoUrl: "0kr6EazpZxA" },
  { name: "Decline Dumbbell Press", nameEn: "Decline Dumbbell Press", muscleGroup: "chest", primaryMuscle: "Ngực dưới", equipment: "dumbbell", videoUrl: "8c0HTYMFfjY" },
  { name: "Decline Dumbbell Fly", nameEn: "Decline Dumbbell Fly", muscleGroup: "chest", primaryMuscle: "Ngực dưới (giãn)", equipment: "dumbbell", videoUrl: "FJjWPWyxr_o" },
  { name: "Single Arm Cable Fly", nameEn: "Single Arm Cable Fly", muscleGroup: "chest", primaryMuscle: "Ngực (1 bên)", equipment: "cable", videoUrl: "vOaJzDJX9C8" },
  { name: "Standing Cable Press", nameEn: "Standing Cable Chest Press", muscleGroup: "chest", primaryMuscle: "Ngực + Core đứng", equipment: "cable", videoUrl: "NFzTWp2qpiE" },
  { name: "Hammer Strength Chest Press", nameEn: "Iso-Lateral Chest Press", muscleGroup: "chest", primaryMuscle: "Ngực giữa", equipment: "machine", videoUrl: "EeaBJTAal_8" },
  { name: "Plyo Push-up (Clap Push-up)", nameEn: "Clap Push-up", muscleGroup: "chest", primaryMuscle: "Ngực + Bùng nổ", equipment: "bodyweight", videoUrl: "kpLDkRr3WZc" },
  { name: "Spider-Man Push-up", nameEn: "Spider-Man Push-up", muscleGroup: "chest", primaryMuscle: "Ngực + Core + Hông", equipment: "bodyweight", videoUrl: "Tn6Tpx_GsOo" },
  { name: "Archer Push-up", nameEn: "Archer Push-up", muscleGroup: "chest", primaryMuscle: "Ngực (1 bên dồn lực)", equipment: "bodyweight", videoUrl: "F5CnTXHqsdU" },
  { name: "Pseudo Planche Push-up", nameEn: "Pseudo Planche Push-up", muscleGroup: "chest", primaryMuscle: "Ngực trên + Vai trước", equipment: "bodyweight", videoUrl: "GJjpr15chJ4" },
  { name: "Hindu Push-up", nameEn: "Hindu Push-up", muscleGroup: "chest", primaryMuscle: "Ngực + Vai + Linh hoạt", equipment: "bodyweight", videoUrl: "RL84j-7Ek0Y" },
  { name: "Around the World (Dumbbell)", nameEn: "DB Around the World", muscleGroup: "chest", primaryMuscle: "Ngực toàn diện", equipment: "dumbbell", videoUrl: "6dXogq8h2dE" },

  // ===== LƯNG chuyên sâu =====
  { name: "Single Arm Lat Pulldown", nameEn: "Single Arm Lat Pulldown", muscleGroup: "back", primaryMuscle: "Lưng xô (1 bên)", equipment: "cable", videoUrl: "DXmA3GVerEs" },
  { name: "Reverse Grip Lat Pulldown", nameEn: "Reverse Grip Lat Pulldown", muscleGroup: "back", primaryMuscle: "Lưng xô (cơ dài) + Tay trước", equipment: "cable", videoUrl: "4bgaVlDyrlE" },
  { name: "V-Bar Lat Pulldown", nameEn: "V-Bar Lat Pulldown", muscleGroup: "back", primaryMuscle: "Lưng xô (dày)", equipment: "cable", videoUrl: "RgGdHCSEkx0" },
  { name: "Wide Grip Cable Row", nameEn: "Wide Grip Cable Row", muscleGroup: "back", primaryMuscle: "Lưng trên + Vai sau", equipment: "cable", videoUrl: "GZbfZ033f74" },
  { name: "Yates Row (Underhand)", nameEn: "Yates Row", muscleGroup: "back", primaryMuscle: "Lưng giữa + Tay trước", equipment: "barbell", videoUrl: "9efgcAjQe7E" },
  { name: "Seal Row", nameEn: "Seal Row", muscleGroup: "back", primaryMuscle: "Lưng giữa (cô lập, không gian lận)", equipment: "barbell", videoUrl: "yp7tVZ4U-3o" },
  { name: "Reverse Hyperextension", nameEn: "Reverse Hyperextension", muscleGroup: "back", primaryMuscle: "Lưng dưới + Mông", equipment: "machine", videoUrl: "ZeRnQVj0pqQ" },
  { name: "Banded Pull Apart", nameEn: "Banded Pull Apart", muscleGroup: "back", primaryMuscle: "Vai sau + Lưng trên", equipment: "band", videoUrl: "f9GmjC1RKsg" },
  { name: "Behind the Back Shrug", nameEn: "Behind the Back Shrug", muscleGroup: "back", primaryMuscle: "Cầu vai (cô lập)", equipment: "barbell", videoUrl: "bdrJ6F9ic2k" },
  { name: "Deficit Deadlift", nameEn: "Deficit Deadlift", muscleGroup: "back", primaryMuscle: "Lưng dưới + Đùi sau (range dài)", equipment: "barbell", videoUrl: "nNN3hjT1F8I" },
  { name: "Stiff-Leg Deadlift", nameEn: "Stiff-Leg Deadlift", muscleGroup: "back", primaryMuscle: "Đùi sau + Lưng dưới", equipment: "barbell", videoUrl: "qmH7C5YmOgA" },
  { name: "Block Pull", nameEn: "Block Pull / Block Deadlift", muscleGroup: "back", primaryMuscle: "Lưng trên (lockout)", equipment: "barbell", videoUrl: "06ZYAlnjFzo" },
  { name: "Towel Pull-up", nameEn: "Towel Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô + Cẳng tay (grip)", equipment: "bodyweight", videoUrl: "Y_QwMQQQ3JM" },
  { name: "L-Sit Pull-up", nameEn: "L-Sit Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô + Core", equipment: "bodyweight", videoUrl: "VUFzYpaQEVU" },
  { name: "Archer Pull-up", nameEn: "Archer Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô (1 bên dồn lực)", equipment: "bodyweight", videoUrl: "qHZdSHxn5lk" },
  { name: "Commando Pull-up", nameEn: "Commando Pull-up", muscleGroup: "back", primaryMuscle: "Lưng xô + Tay trước", equipment: "bodyweight", videoUrl: "0AURDY3TBuo" },
  { name: "Cable Pullover (Đứng)", nameEn: "Standing Cable Pullover", muscleGroup: "back", primaryMuscle: "Lưng xô (giãn dài)", equipment: "cable", videoUrl: "y4tcAYQRivg" },
  { name: "Smith Machine Row", nameEn: "Smith Machine Row", muscleGroup: "back", primaryMuscle: "Lưng giữa", equipment: "machine", videoUrl: "vT2GjY_Umpw" },
  { name: "Dead Hang (Treo xà)", nameEn: "Dead Hang", muscleGroup: "back", primaryMuscle: "Cẳng tay (grip) + Vai", equipment: "bodyweight", videoUrl: "cNtv1tQ-PEY" },
  { name: "Bent-Over Reverse Fly", nameEn: "Bent-Over Reverse Fly", muscleGroup: "back", primaryMuscle: "Vai sau + Lưng trên", equipment: "dumbbell", videoUrl: "ttvfGg9d76c" },
];

const templates = [
  {
    name: "Push (Đẩy)",
    emoji: "🔥",
    description: "Ngực + Vai + Tay sau",
    exercises: [
      { name: "Bench Press (Tạ đòn)", sets: 4, reps: 8, rest: 120 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, rest: 90 },
      { name: "Overhead Press (OHP)", sets: 4, reps: 8, rest: 120 },
      { name: "Lateral Raise (Vai ngang)", sets: 3, reps: 12, rest: 60 },
      { name: "Tricep Pushdown (Đẩy tô tay sau)", sets: 3, reps: 12, rest: 60 },
      { name: "Skull Crusher", sets: 3, reps: 10, rest: 60 },
    ],
  },
  {
    name: "Pull (Kéo)",
    emoji: "💪",
    description: "Lưng + Tay trước",
    exercises: [
      { name: "Deadlift (Tạ chết)", sets: 4, reps: 6, rest: 180 },
      { name: "Pull-up (Xà đơn)", sets: 4, reps: 8, rest: 120 },
      { name: "Barbell Row (Chèo tạ đòn)", sets: 4, reps: 8, rest: 90 },
      { name: "Lat Pulldown (Kéo xô)", sets: 3, reps: 10, rest: 90 },
      { name: "Barbell Curl (Cuộn tạ đòn)", sets: 3, reps: 10, rest: 60 },
      { name: "Hammer Curl", sets: 3, reps: 12, rest: 60 },
    ],
  },
  {
    name: "Legs (Chân)",
    emoji: "🦵",
    description: "Đùi + Mông + Bắp chuối",
    exercises: [
      { name: "Squat (Tạ đòn)", sets: 4, reps: 8, rest: 180 },
      { name: "Romanian Deadlift (RDL)", sets: 4, reps: 8, rest: 120 },
      { name: "Leg Press (Đạp chân)", sets: 3, reps: 12, rest: 90 },
      { name: "Leg Extension (Duỗi chân)", sets: 3, reps: 12, rest: 60 },
      { name: "Leg Curl (Cuộn chân)", sets: 3, reps: 12, rest: 60 },
      { name: "Calf Raise (Bắp chuối)", sets: 4, reps: 15, rest: 45 },
    ],
  },
  {
    name: "Upper (Thân trên)",
    emoji: "🏋️",
    description: "Ngực + Lưng + Vai + Tay",
    exercises: [
      { name: "Bench Press (Tạ đòn)", sets: 4, reps: 8, rest: 120 },
      { name: "Barbell Row (Chèo tạ đòn)", sets: 4, reps: 8, rest: 120 },
      { name: "Overhead Press (OHP)", sets: 3, reps: 10, rest: 90 },
      { name: "Lat Pulldown (Kéo xô)", sets: 3, reps: 10, rest: 90 },
      { name: "Dumbbell Curl", sets: 3, reps: 12, rest: 60 },
      { name: "Tricep Pushdown (Đẩy tô tay sau)", sets: 3, reps: 12, rest: 60 },
    ],
  },
  {
    name: "Lower (Thân dưới)",
    emoji: "🦵",
    description: "Đùi + Mông + Core",
    exercises: [
      { name: "Squat (Tạ đòn)", sets: 4, reps: 8, rest: 180 },
      { name: "Romanian Deadlift (RDL)", sets: 4, reps: 10, rest: 120 },
      { name: "Bulgarian Split Squat", sets: 3, reps: 10, rest: 90 },
      { name: "Hip Thrust", sets: 3, reps: 12, rest: 90 },
      { name: "Calf Raise (Bắp chuối)", sets: 4, reps: 15, rest: 45 },
      { name: "Plank", sets: 3, reps: 60, rest: 60 },
    ],
  },
  {
    name: "Full Body",
    emoji: "⚡",
    description: "Toàn thân cho người mới",
    exercises: [
      { name: "Squat (Tạ đòn)", sets: 3, reps: 10, rest: 120 },
      { name: "Bench Press (Tạ đòn)", sets: 3, reps: 10, rest: 120 },
      { name: "Barbell Row (Chèo tạ đòn)", sets: 3, reps: 10, rest: 90 },
      { name: "Overhead Press (OHP)", sets: 3, reps: 10, rest: 90 },
      { name: "Plank", sets: 3, reps: 45, rest: 45 },
    ],
  },
];

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  for (const ex of exercises) {
    // Update videoUrl cho bài đã có nếu seed có cung cấp (để re-seed cập nhật được)
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: ex.videoUrl !== undefined ? { videoUrl: ex.videoUrl } : {},
      create: ex,
    });
  }
  console.log(`✅ Đã thêm/cập nhật ${exercises.length} bài tập`);

  for (const tpl of templates) {
    const existing = await prisma.template.findFirst({ where: { name: tpl.name } });
    if (existing) {
      console.log(`⏭️  Template "${tpl.name}" đã tồn tại, bỏ qua`);
      continue;
    }
    const created = await prisma.template.create({
      data: {
        name: tpl.name,
        emoji: tpl.emoji,
        description: tpl.description,
      },
    });

    for (let i = 0; i < tpl.exercises.length; i++) {
      const item = tpl.exercises[i];
      const exercise = await prisma.exercise.findUnique({ where: { name: item.name } });
      if (!exercise) continue;
      await prisma.templateExercise.create({
        data: {
          templateId: created.id,
          exerciseId: exercise.id,
          order: i,
          defaultSets: item.sets,
          defaultReps: item.reps,
          restSeconds: item.rest,
        },
      });
    }
    console.log(`✅ Đã tạo template "${tpl.name}" với ${tpl.exercises.length} bài`);
  }

  console.log("🎉 Seed hoàn thành!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

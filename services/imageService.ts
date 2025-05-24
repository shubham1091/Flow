import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/constants";
import { ResponseType } from "@/types";
import axios from "axios";

// const CLOUDINARY_CLOUD_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`;
const CLOUDINARY_CLOUD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

export const getProfileImage = (file: any) => {
  if (file && typeof file == "string") return file;
  if (file && typeof file == "object") return file.uri;

  return require("@/assets/images/defaultAvatar.png");
};

export const uploadFileToCloudinary = async (
  file: { uri?: string } | string,
  folderName: string
): Promise<ResponseType> => {
  try {
    if (!file){
      return { success: true, data: null };
    }
    if (typeof file == "string") {
      return { success: true, data: file };
    }
    if (file && file.uri) {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: "image/jpeg",
        name: file?.uri?.split("/").pop() || "file.jpg",
      } as any);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", folderName);

      const response = await axios.post(CLOUDINARY_CLOUD_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("upload response", response.data)
      return { success: true, data: response.data.secure_url };
    }
    return { success: true};
  } catch (error: any) {
    console.log("Error uploading file to Cloudinary", error);
    return {
      success: false,
      msg: error.message || "Error uploading file to Cloudinary",
    };
  }
};


export const getFilePath = (file: any) => {
  if (file && typeof file == "string") return { uri: file };
  if (file && typeof file == "object") return { uri: file.uri };

  return null;
}
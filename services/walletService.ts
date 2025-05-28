import { ResponseType, WalletType } from "@/types";
import { uploadFileToCloudinary } from "./imageService";
import { collection, deleteDoc, doc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import { firestore } from "@/config/firebase";

export const createOrUpdateWallet = async (
  walletData: Partial<WalletType>
): Promise<ResponseType> => {
  try {
    let walletToSave = { ...walletData };
    if (walletData.image) {
      const imageUploadres = await uploadFileToCloudinary(
        walletData.image,
        "wallets"
      );
      if (!imageUploadres.success) {
        return {
          success: false,
          msg: imageUploadres.msg || "Error uploading wallet image",
        };
      }
      walletToSave.image = imageUploadres.data;
    }

    if (!walletData?.id) {
      walletToSave.amount = 0;
      walletToSave.totalIncome = 0;
      walletToSave.totalExpenses = 0;
      walletToSave.created = new Date();
    }

    const walletRef = walletData?.id
      ? doc(firestore, "wallets", walletData.id)
      : doc(collection(firestore, "wallets"));

    await setDoc(walletRef, walletToSave, {
      merge: true,
    });

    return { success: true, data: { ...walletToSave, id: walletRef.id } };
  } catch (error: any) {
    console.log("Error creating or updating wallet", error);
    return {
      success: false,
      msg: error.message || "Error creating or updating wallet",
    };
  }
};

export const deleteWallet = async (walletId: string): Promise<ResponseType> => {
  try {
    const walletref = doc(firestore, "wallets", walletId);
    await deleteDoc(walletref);

    // todo: delete all transactions related to this wallet
    deleteTransactionByWallet(walletId);

    return { success: true, msg: "Wallet deleted successfully" };
  } catch (error: any) {
    console.log("Error deleting wallet", error);
    return {
      success: false,
      msg: error.message || "Error deleting wallet",
    };
  }
};

export const deleteTransactionByWallet = async (
  walletId: string
): Promise<ResponseType> => {
  try {
    let hasMoreTransactions = true;

    while (hasMoreTransactions) {
      const transactionQuery = query(
        collection(firestore, "transactions"),
        where("walletId", "==", walletId)
      )

      const transactionSnapshot = await getDocs(transactionQuery);

      if(transactionSnapshot.size == 0){
        hasMoreTransactions = false;
        break;
      }

      const batch = writeBatch(firestore);
      transactionSnapshot.forEach((transactionDoc)=>{
        batch.delete(transactionDoc.ref);
      })

      await batch.commit();
    }

    // todo: delete all transactions related to this wallet

    return { success: true, msg: "transactions deleted successfully" };
  } catch (error: any) {
    console.log("Error deleting wallet", error);
    return {
      success: false,
      msg: error.message || "Error deleting transactions",
    };
  }
};

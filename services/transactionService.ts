import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";

export const createOrUpdateTransaction = async (
  transactionData: Partial<TransactionType>
): Promise<ResponseType> => {
  // Implementation for creating or updating a transaction
  try {
    const { id, type, walletId, image, amount } = transactionData;
    if (!amount || amount <= 0 || !walletId || !type) {
      return { success: false, msg: "Invalid transaction data" };
    }

    if (id) {
      // update transaction
    } else {
      // create transaction
      let res = await updateWalletForNewTransaction(walletId, amount, type);
      if (!res.success) {
        return res; // Return error if wallet update fails
      }
    }
    if (image) {
      const imageUploadRes = await uploadFileToCloudinary(
        image,
        "transactions"
      );
      if (!imageUploadRes.success) {
        return {
          success: false,
          msg: "Error uploading Receipt image",
        };
      }
      transactionData.image = imageUploadRes.data;
    }
    const transactionRef = id
      ? doc(firestore, "transactions", id)
      : doc(collection(firestore, "transactions"));

    await setDoc(transactionRef, { transactionData }, { merge: true });

    return {
      success: true,
      data: { ...transactionData, id: transactionRef.id },
      msg: id
        ? "Transaction updated successfully"
        : "Transaction created successfully",
    };
  } catch (error: any) {
    console.log("Error creating or updating transaction:", error);
    return {
      success: false,
      msg: error.message || "Error creating transaction",
    };
  }
};

const updateWalletForNewTransaction = async (
  walletId: string,
  amount: number,
  type: string
) => {
  try {
    const walletRef = doc(firestore, "wallets", walletId);
    const walletSnapShot = await getDoc(walletRef);
    if (!walletSnapShot.exists()) {
      console.log("Wallet not found");
      return {
        success: false,
        msg: "Wallet not found",
      };
    }
    const walletData = walletSnapShot.data() as WalletType;
    if (type == "expense" && walletData.amount! - amount < 0) {
      return {
        success: false,
        msg: "Insufficient balance in wallet",
      };
    }

    const updateType = type == "income" ? "totalIncome" : "totalExpenses";
    const updatedAmount =
      type == "income"
        ? Number(walletData.amount) + amount
        : Number(walletData.amount) - amount;

    const updateTotals =
      type == "income"
        ? Number(walletData.totalIncome) + amount
        : Number(walletData.totalExpenses) + amount;

    await updateDoc(walletRef, {
      amount: updatedAmount,
      [updateType]: updateTotals,
    });

    return {
      success: true,
      msg: "Wallet updated successfully",
      updatedAmount,
      updatedTotals: updateTotals,
    };
  } catch (error: any) {
    console.log("Error updating wallet for new transaction:", error);
    return {
      success: false,
      msg: error.message || "Error updating wallet",
    };
  }
};

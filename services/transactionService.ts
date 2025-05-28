import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";
import { createOrUpdateWallet } from "./walletService";

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
      const oldTransactionSnapshot = await getDoc(
        doc(firestore, "transactions", id)
      );
      const oldtransaction = oldTransactionSnapshot.data() as TransactionType;

      const shouldRevertOriginal =
        oldtransaction.type != type ||
        oldtransaction.amount != amount ||
        oldtransaction.walletId != walletId;

      if (shouldRevertOriginal) {
        let res = await revertAndUpdateWallets(
          oldtransaction,
          Number(amount),
          type,
          walletId
        );
        if (!res.success) {
          return res; // Return error if wallet update fails
        }
      }
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

    // await setDoc(transactionRef, { transactionData }, { merge: true });÷
    await setDoc(transactionRef, transactionData, { merge: true });

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

const revertAndUpdateWallets = async (
  oldtransaction: TransactionType,
  amount: number,
  type: string,
  walletId: string
) => {
  try {
    const orignalWalletSnapshot = await getDoc(
      doc(firestore, "wallets", oldtransaction.walletId)
    );

    const orignalWallet = orignalWalletSnapshot.data() as WalletType;
    let newWalletSnapshot = await getDoc(doc(firestore, "wallets", walletId));
    let newWallet = newWalletSnapshot.data() as WalletType;

    const revertType =
      oldtransaction.type == "income" ? "totalIncome" : "totalExpenses";
    const revertIncomeExpense =
      oldtransaction.type == "income"
        ? -Number(oldtransaction.amount)
        : Number(oldtransaction.amount);

    const revertedWalletAmount =
      Number(orignalWallet.amount) + revertIncomeExpense;

    const revertedIncomeExpenseAmount =
      Number(orignalWallet[revertType]) - oldtransaction.amount;

    if (type == "expense") {
      if (
        oldtransaction.walletId == walletId &&
        revertedWalletAmount < amount
      ) {
        return { success: false, msg: "Insufficient balance in wallet" };
      }
    }

    if (newWallet.amount! < amount) {
      return { success: false, msg: "Insufficient balance in wallet" };
    }

    await createOrUpdateWallet({
      id: oldtransaction.walletId,
      amount: revertedWalletAmount,
      [revertType]: revertedIncomeExpenseAmount,
    });

    newWalletSnapshot = await getDoc(doc(firestore, "wallets", walletId));
    newWallet = newWalletSnapshot.data() as WalletType;

    const updateType = type == "income" ? "totalIncome" : "totalExpenses";
    const updatedTransactionAmount =
      type == "income" ? Number(amount) : -Number(amount);

    const newWalletAmount = Number(newWallet.amount) + updatedTransactionAmount;

    const newIncomeExpenseAmount =
      Number(newWallet[updateType]) + Number(amount);

    await createOrUpdateWallet({
      id: walletId,
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount,
    });

    return {
      success: true,
      msg: "Wallet updated successfully",
      updatedAmount: updatedTransactionAmount,
      updatedTotals: newIncomeExpenseAmount,
    };
  } catch (error: any) {
    console.log("Error updating wallet for new transaction:", error);
    return {
      success: false,
      msg: error.message || "Error updating wallet",
    };
  }
};

export const deleteTransaction = async (
  transactionId: string,
  walletId: string
): Promise<ResponseType> => {
  try {
    const transactionRef = doc(firestore, "transactions", transactionId);
    const transactionSnapshot = await getDoc(transactionRef);
    if (!transactionSnapshot.exists()) {
      return { success: false, msg: "Transaction not found" };
    }
    const transactionData = transactionSnapshot.data() as TransactionType;

    const transactionType = transactionData.type;
    const transactionAmount = transactionData.amount;

    const walletSnapshot = await getDoc(doc(firestore, "wallets", walletId));
    if (!walletSnapshot.exists()) {
      return { success: false, msg: "Wallet not found" };
    }
    const walletData = walletSnapshot.data() as WalletType;

    const updateType =
      transactionType == "income" ? "totalIncome" : "totalExpenses";
    const newWalletAmount =
      walletData.amount! -
      (transactionType == "income" ? transactionAmount : -transactionAmount);

    const newIncomeExpenseAmount = walletData[updateType]! - transactionAmount;

    if (transactionType == "income" && newWalletAmount < 0) {
      return { success: false, msg: "You cannot delete this transaction" };
    }

    await createOrUpdateWallet({
      id: walletId,
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount,
    });
    await deleteDoc(transactionRef);
    return { success: true, msg: "Transaction deleted successfully" };
  } catch (error: any) {
    console.log("Error deleting transaction:", error);
    return {
      success: false,
      msg: error.message || "Error deleting transaction",
    };
  }
};

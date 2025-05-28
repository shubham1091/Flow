import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageService";
import { createOrUpdateWallet } from "./walletService";
import { getLast12Months, getLast7Days, getYearsRange } from "@/utils/common";
import { scale } from "@/utils/styling";
import { colors } from "@/constants/theme";

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

export const fetchWeeklyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const transactionQuery = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(sevenDaysAgo)), // changed from "data"
      where("date", "<=", Timestamp.fromDate(today)),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);
    const weeklyData = getLast7Days();
    const transactions: TransactionType[] = [];
    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;
      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionDate = (transaction.date as Timestamp)
        .toDate()
        .toISOString()
        .split("T")[0];

      const dayData = weeklyData.find((d) => d.date == transactionDate);

      if (dayData) {
        if (transaction.type == "income") {
          dayData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          dayData.expense += transaction.amount;
        }
      }
    });

    const stats = weeklyData.flatMap((d) => [
      {
        value: d.income,
        label: d.day,
        spacing: scale(4),
        labelWidth: scale(30),
        frontColor: colors.primary,
      },
      {
        value: d.expense,
        frontColor: colors.rose,
      },
    ]);

    return {
      success: true,
      data: { stats, transactions },
      msg: "Weekly stats fetched successfully",
    };
  } catch (error: any) {
    console.log("Error fetching weekly stats:", error);
    return {
      success: false,
      msg: error.message || "Error fetching weekly stats",
    };
  }
};

export const fetchMonthlyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setDate(today.getMonth() - 12);

    const transactionQuery = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(twelveMonthsAgo)), // changed from "data"
      where("date", "<=", Timestamp.fromDate(today)),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);
    const monthlyData = getLast12Months();
    const transactions: TransactionType[] = [];
    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;
      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionDate = (transaction.date as Timestamp).toDate();

      const monthName = transactionDate.toLocaleString("default", {
        month: "short",
      });
      const shortYear = transactionDate.getFullYear().toString().slice(-2);

      const monthData = monthlyData.find(
        (d) => d.month === `${monthName} ${shortYear}`
      );

      if (monthData) {
        if (transaction.type == "income") {
          monthData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          monthData.expense += transaction.amount;
        }
      }
    });

    const stats = monthlyData.flatMap((d) => [
      {
        value: d.income,
        label: d.month,
        spacing: scale(4),
        labelWidth: scale(30),
        frontColor: colors.primary,
      },
      {
        value: d.expense,
        frontColor: colors.rose,
      },
    ]);

    return {
      success: true,
      data: { stats, transactions },
      msg: "Weekly stats fetched successfully",
    };
  } catch (error: any) {
    console.log("Error fetching weekly stats:", error);
    return {
      success: false,
      msg: error.message || "Error fetching weekly stats",
    };
  }
};

export const fetchYearlyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;

    const transactionQuery = query(
      collection(db, "transactions"),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);
    const transactions: TransactionType[] = [];

    const firstTransaction = querySnapshot.docs.reduce((acc, doc) => {
      const transactionDate = doc.data().date.toDate();
      return transactionDate < acc ? transactionDate : acc;
    }, new Date())

    const firstYear = firstTransaction.getFullYear();
    const currentYear = new Date().getFullYear();

    const yearlyData = getYearsRange(firstYear, currentYear);


    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;
      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionYear = (transaction.date as Timestamp).toDate().getFullYear();

      const yearData = yearlyData.find((d:any)=> d.year == transactionYear.toString()
      );

      if (yearData) {
        if (transaction.type == "income") {
          yearData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          yearData.expense += transaction.amount;
        }
      }
    });

    const stats = yearlyData.flatMap((d:any) => [
      {
        value: d.income,
        label: d.year,
        spacing: scale(4),
        labelWidth: scale(35),
        frontColor: colors.primary,
      },
      {
        value: d.expense,
        frontColor: colors.rose,
      },
    ]);

    return {
      success: true,
      data: { stats, transactions },
      msg: "Weekly stats fetched successfully",
    };
  } catch (error: any) {
    console.log("Error fetching weekly stats:", error);
    return {
      success: false,
      msg: error.message || "Error fetching weekly stats",
    };
  }
};
"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { doc, getDocs, collection, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface User {
  id: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
  isWorker: boolean;
}

const PromoteWorkersPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Authenticate and check admin status
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/signin");
      } else {
        setUser(currentUser);

        try {
          // Fetch user's document
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.isAdmin || false);
            if (!userData.isAdmin) {
              router.push("/dashboard"); // Redirect non-admins to dashboard
            }
          } else {
            console.warn("No user document found.");
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          router.push("/dashboard");
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Fetch all users
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        const querySnapshot = await getDocs(usersCollection);

        const usersList: User[] = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Unknown",
              email: data.email || "No Email",
              isAdmin: data.isAdmin === true,
              isWorker: data.isWorker === true,
            };
          })
          .filter((user) => user.isWorker === false); // Only include users who are not workers

        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handlePromoteToWorker = async (userId: string, userName: string) => {
    const confirmPromotion = window.confirm(
      `Are you sure you want to promote ${userName} to a Worker?`
    );

    if (!confirmPromotion) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isWorker: true });
      alert(`${userName} has been promoted to worker.`);
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userId) // Remove the promoted user from the list
      );
    } catch (error) {
      console.error("Error promoting user to worker:", error);
      alert("Failed to promote user. Please try again.");
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="admin-container">
      <h1>Promote to Worker</h1>
      <div className="user-list">
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <p>
              <strong>Name:</strong> {user.name || "Unknown"}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Admin Status:</strong> {user.isAdmin ? "Admin" : "Not Admin"}
            </p>
            <p>
              <strong>Worker Status:</strong> {user.isWorker ? "Worker" : "Not Worker"}
            </p>
            <button
              onClick={() => handlePromoteToWorker(user.id, user.name || "this user")}
              className="promote-btn"
              style={{
                backgroundColor: "green",
                color: "white",
                padding: "10px 20px",
                borderRadius: "5px",
              }}
            >
              Promote to Worker
            </button>
            <hr />
          </div>
        ))}
      </div>
    
    {/* Back to Home Button */}
    <button
        onClick={() => router.push("/dashboard")} // Redirect to dashboard
        style={{
          display: "block",
          margin: "20px auto",
          padding: "10px",
          fontSize: "16px",
          backgroundColor: "#6c757d",
          color: "#FFF",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          maxWidth: "200px",
        }}
      >
        Back to Home
      </button>
    </div>
  );
};

export default PromoteWorkersPage;

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let unsubscribeFoodList = null;

const firebaseConfig = {
    apiKey: "AIzaSyBGciTcXZA9aTb3R5V823vXHrPNgQ5uTuk",
    authDomain: "food-app-2025.firebaseapp.com",
    projectId: "food-app-2025",
    storageBucket: "food-app-2025.appspot.com", // Fixed incorrect URL
    messagingSenderId: "958519394036",
    appId: "1:958519394036:web:c21ea534ff7bcece0228a1",
    measurementId: "G-V55YWPBZ94"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Create an instance of the Google provider object:
const provider = new GoogleAuthProvider();


document.addEventListener("DOMContentLoaded", () => {
    const loginView = document.getElementById("login-view");
    const foodInputView = document.getElementById("food-input-view");
    const welcomeMessage = document.getElementById("welcome-message");

    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const logoutFoodBtn = document.getElementById("logout-btn-food");

    function showView(view) {
        loginView.style.display = view === "login" ? "block" : "none";
        foodInputView.style.display = view === "food" ? "block" : "none";
    }

    function loadFoodList() {
        const foodListContainer = document.getElementById("food-list-container"); // The wrapper div for food list
        const foodList = document.getElementById("food-list");
        const foodNamesList = document.getElementById("food-names");
        const restaurantNamesList = document.getElementById("restaurant-names");

        const foodFilter = document.getElementById("food-filter");
        const restaurantFilter = document.getElementById("restaurant-filter");
        const clearFiltersBtn = document.getElementById("clear-filters");

        foodListContainer.style.display = "none"; // Hide initially
        foodList.innerHTML = "";
        foodNamesList.innerHTML = "";
        restaurantNamesList.innerHTML = "";

        const foodCollection = collection(db, "users", auth.currentUser.uid, "foods");

        if (unsubscribeFoodList) {
            unsubscribeFoodList();
        }

        unsubscribeFoodList = onSnapshot(foodCollection, (snapshot) => {
            let foodSet = new Set();
            let restaurantSet = new Set();
            let foodArray = [];

            snapshot.forEach((doc) => {
                const food = doc.data();
                foodSet.add(food.name);
                restaurantSet.add(food.restaurant);
                foodArray.push({ id: doc.id, ...food });
            });

            // Populate datalists
            foodNamesList.innerHTML = [...foodSet].map(name => `<option value="${name}">`).join("");
            restaurantNamesList.innerHTML = [...restaurantSet].map(restaurant => `<option value="${restaurant}">`).join("");

            function renderFoodList() {
                const selectedFood = foodFilter.value.trim();
                const selectedRestaurant = restaurantFilter.value.trim();

                let filteredFood = foodArray;

                if (selectedFood) {
                    filteredFood = filteredFood.filter(item => item.name.toLowerCase() === selectedFood.toLowerCase());
                }

                if (selectedRestaurant) {
                    filteredFood = filteredFood.filter(item => item.restaurant.toLowerCase() === selectedRestaurant.toLowerCase());
                }

                // If there's no filtering, keep the list hidden
                if (!selectedFood && !selectedRestaurant) {
                    foodListContainer.style.display = "none";
                    return;
                }

                // Show food list container when filters are applied
                foodListContainer.style.display = "block";

                // Sort by rating (best to worst)
                filteredFood.sort((a, b) => b.rating - a.rating);

                // Display filtered and sorted food list
                foodList.innerHTML = "";
                filteredFood.forEach((food) => {
                    const li = document.createElement("li");
                    li.classList.add("food-item");
                    li.innerHTML = `
                        <div class="food-column restaurant">${food.restaurant}</div>
                        <div class="food-column name">${food.name}</div>
                        <div class="food-column rating">${food.rating} Stars</div>
                        <div class="food-column actions">
                            <button class="edit-btn" data-id="${food.id}">Edit</button>
                            <button class="delete-btn" data-id="${food.id}">Delete</button>
                            <button class="notes-btn" data-id="${food.id}">Notes</button>
                        </div>
                    `;
                    foodList.appendChild(li);
                });
            }

            // Listen for changes in filters
            foodFilter.addEventListener("input", renderFoodList);
            restaurantFilter.addEventListener("input", renderFoodList);
            clearFiltersBtn.addEventListener("click", () => {
                foodFilter.value = "";
                restaurantFilter.value = "";
                foodListContainer.style.display = "none"; // Hide list again
                renderFoodList();
            });

            // Initial render (hidden by default)
            foodListContainer.style.display = "none";

            // Event Listeners for actions
            foodList.addEventListener("click", async (event) => {
                const target = event.target;
                const foodId = target.dataset.id;
                if (!foodId) return; // Exit if no foodId

                if (target.classList.contains("delete-btn")) {
                    try {
                        // Confirmation before deleting (better UX)
                        if (confirm("Are you sure you want to delete this food item?")) {
                            await deleteDoc(doc(db, "users", auth.currentUser.uid, "foods", foodId));
                            showToast("Food item deleted!");
                        }
                    } catch (error) {
                        showToast("Error deleting food: " + error.message, "error");
                    }
                } else if (target.classList.contains("edit-btn")) {
                    openEditModal(foodId);
                } else if (target.classList.contains("notes-btn")) {
                    openNotesModal(foodId);
                }
            });

            // Edit functionality
            async function openEditModal(foodId) {
                const foodDocRef = doc(db, "users", auth.currentUser.uid, "foods", foodId);
                const foodDocSnap = await getDoc(foodDocRef);

                if (foodDocSnap.exists()) {
                    const foodData = foodDocSnap.data();

                    // Populate modal with existing data
                    document.getElementById("edit-food-name").value = foodData.name;
                    document.getElementById("edit-restaurant").value = foodData.restaurant;
                    document.getElementById("edit-rating").value = foodData.rating;
                    document.getElementById("edit-food-id").value = foodId; //Hidden value

                    // Show the modal
                    document.getElementById("editFoodModal").style.display = "block";
                } else {
                    showToast("Food item not found", "error");
                }
            }

            // Event listeners for edit modal
            // close the modal
            document.querySelector("#editFoodModal .close").addEventListener("click", function () {
                document.getElementById("editFoodModal").style.display = "none";
            });

            // If the user clicks outside the modal, close it
            window.addEventListener("click", (event) => {
                if (event.target == document.getElementById("editFoodModal")) {
                    document.getElementById("editFoodModal").style.display = "none";
                }
            });

            // Update the database on save
            document.getElementById("save-edit-btn").addEventListener("click", async () => {
                const foodId = document.getElementById("edit-food-id").value;
                try {
                    // Update existing food info
                    const foodDocRef = doc(db, "users", auth.currentUser.uid, "foods", foodId);
                    await updateDoc(foodDocRef, {
                        name: document.getElementById("edit-food-name").value,
                        restaurant: document.getElementById("edit-restaurant").value,
                        rating: document.getElementById("edit-rating").value,
                    });
                    showToast("Food item updated!");

                    // Close the modal
                    document.getElementById("editFoodModal").style.display = "none";
                } catch (error) {
                    showToast("Error updating food: " + error.message, "error");
                }
            });

            // Notes functionality
            async function openNotesModal(foodId) {
                const foodDocRef = doc(db, "users", auth.currentUser.uid, "foods", foodId);
                const foodDocSnap = await getDoc(foodDocRef);

                if (foodDocSnap.exists()) {
                    const foodData = foodDocSnap.data();

                    // Populate modal with existing data
                    document.getElementById("notes-food-name").value = foodData.name; // Just to show which food are you adding notes to
                    document.getElementById("food-notes").value = foodData.notes || ""; // Fill with existing notes or empty string
                    document.getElementById("notes-food-id").value = foodId; //Hidden value

                    // Show the modal
                    document.getElementById("notesModal").style.display = "block";
                } else {
                    showToast("Food item not found", "error");
                }
            }

            // Event listeners for notes modal

            // close the modal
            document.querySelector("#notesModal .close-notes").addEventListener("click", function () {
                document.getElementById("notesModal").style.display = "none";
            });

            // If the user clicks outside the modal, close it
            window.addEventListener("click", (event) => {
                if (event.target == document.getElementById("notesModal")) {
                    document.getElementById("notesModal").style.display = "none";
                }
            });

            // Update the database on save
            document.getElementById("save-notes-btn").addEventListener("click", async () => {
                const foodId = document.getElementById("notes-food-id").value;
                try {
                    // Update existing food info
                    const foodDocRef = doc(db, "users", auth.currentUser.uid, "foods", foodId);
                    await updateDoc(foodDocRef, {
                        notes: document.getElementById("food-notes").value,
                    });
                    showToast("Notes saved!");

                    // Close the modal
                    document.getElementById("notesModal").style.display = "none";
                } catch (error) {
                    showToast("Error saving notes: " + error.message, "error");
                }
            });
        });
    }

    function showToast(message, type = "success") {
        Toastify({
            text: message,
            duration: 2000, // 2 seconds
            close: true,
            gravity: "top", // Keeps toast at the top
            position: "center", // Center it properly
            className: "custom-toast", // Add custom styling
            style: {
                background: type === "success" ? "#4caf50" : "#ff3e3e", // Green for success, red for errors
                padding: "12px",
                borderRadius: "5px",
                fontSize: "16px",
                width: "auto", // Ensures it doesn't stretch weirdly
                textAlign: "center"
            },
            offset: {
                x: 0, // Align with the fixed container
                y: 10 // Prevent overlap with header
            },
        }).showToast();
    }


    onAuthStateChanged(auth, (user) => {
        if (user) {
            welcomeMessage.innerText = `Welcome, ${user.email}!`;
            document.getElementById("user-email").innerText = user.email;
            loginBtn.style.display = "none";
            registerBtn.style.display = "none";
            logoutBtn.style.display = "block";
            showView("food");
            loadFoodList(); // Fetch and display food list
        } else {
            welcomeMessage.innerText = "Please log in or sign up to continue.";
            document.getElementById("user-email").innerText = "";
            loginBtn.style.display = "block";
            registerBtn.style.display = "block";
            logoutBtn.style.display = "none";
            showView("login");
        }
    });


    document.getElementById("add-food").addEventListener("click", async () => {
        const name = document.getElementById("food-name").value;
        const restaurant = document.getElementById("restaurant").value;

        const rating = document.getElementById("rating").value;

        if (!name || !restaurant) {
            showToast("Please enter both food name and restaurant.");
            return;
        }

        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "foods"), {
                name,
                restaurant,

                rating,
                timestamp: new Date()
            });
            showToast("Food added!");
            document.getElementById("food-name").value = "";
            document.getElementById("restaurant").value = "";

            document.getElementById("rating").value = "1";
        } catch (error) {
            showToast("Error adding food: " + error.message);
        }
    });



    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        if (!email || !password) {
            showToast("Please enter email and password.");
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            //showToast("Login successful!");
        } catch (error) {
            showToast("Login failed: " + error.message);
        }
    });

    registerBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        if (!email || !password) {
            showToast("Please enter email and password.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showToast("Registration successful!");
        } catch (error) {
            showToast("Registration failed: " + error.message);
        }
    });

    logoutBtn.addEventListener("click", async () => {
        try {
            if (unsubscribeFoodList) {
                unsubscribeFoodList(); // Stop Firestore listener
                unsubscribeFoodList = null;
            }
            await signOut(auth);
            //showToast("Logged out successfully!");
        } catch (error) {
            showToast("Logout failed: " + error.message);
        }
    });

    logoutFoodBtn.addEventListener("click", async () => {
        try {
            if (unsubscribeFoodList) {
                unsubscribeFoodList(); // Stop Firestore listener
                unsubscribeFoodList = null;
            }
            await signOut(auth);
            //showToast("Logged out successfully!");
        } catch (error) {
            showToast("Logout failed: " + error.message);
        }
    });

    document.getElementById("google-login-btn").addEventListener("click", () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                // The signed-in user info.
                const user = result.user;
                console.log("Google sign-in success:", user);
                // You can do any post-login logic here,
                // like redirecting to your "food-input-view".
            })
            .catch((error) => {
                console.error("Google sign-in failed:", error);
                showToast("Google sign-in failed: " + error.message);
            });
    });
});
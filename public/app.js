import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
                        <div class="food-column liked">${food.liked ? "Liked" : "Disliked"}</div>
                        <div class="food-column rating">${food.rating} Stars</div>
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
        });
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
        const liked = document.getElementById("like").checked;
        const rating = document.getElementById("rating").value;

        if (!name || !restaurant) {
            alert("Please enter both food name and restaurant.");
            return;
        }

        try {
            await addDoc(collection(db, "users", auth.currentUser.uid, "foods"), {
                name,
                restaurant,
                liked,
                rating,
                timestamp: new Date()
            });
            alert("Food added!");
            document.getElementById("food-name").value = "";
            document.getElementById("restaurant").value = "";
            document.getElementById("like").checked = false;
            document.getElementById("rating").value = "1";
        } catch (error) {
            alert("Error adding food: " + error.message);
        }
    });



    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful!");
        } catch (error) {
            alert("Login failed: " + error.message);
        }
    });

    registerBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Registration successful!");
        } catch (error) {
            alert("Registration failed: " + error.message);
        }
    });

    logoutBtn.addEventListener("click", async () => {
        try {
            if (unsubscribeFoodList) {
                unsubscribeFoodList(); // Stop Firestore listener
                unsubscribeFoodList = null;
            }
            await signOut(auth);
            alert("Logged out successfully!");
        } catch (error) {
            alert("Logout failed: " + error.message);
        }
    });

    logoutFoodBtn.addEventListener("click", async () => {
        try {
            if (unsubscribeFoodList) {
                unsubscribeFoodList(); // Stop Firestore listener
                unsubscribeFoodList = null;
            }
            await signOut(auth);
            alert("Logged out successfully!");
        } catch (error) {
            alert("Logout failed: " + error.message);
        }
    });

});
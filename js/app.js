const firebaseConfig = {
    apiKey: "AIzaSyAQgO12nfWVqWtUz_hPhYoWp3GrbWrtSlk",
    authDomain: "e-commerce-project-bed88.firebaseapp.com",
    projectId: "e-commerce-project-bed88",
    storageBucket: "e-commerce-project-bed88.firebasestorage.app",
    messagingSenderId: "506905111695",
    appId: "1:506905111695:web:39b5f04b20087524df54fa",
    measurementId: "G-LBQX756N1R"
  };
  
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  let currentUser = { uid: null, role: null };
  let allProducts = []; // Store all products for filtering
  
  // Navigation function
  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (sectionId === 'products' && currentUser.role !== 'admin') {
        loadProducts(); // Load products only for non-admin users
    }
    if (sectionId === 'cart') loadCart();
    if (sectionId === 'wishlist') loadWishlist();
    if (sectionId === 'history') loadHistory();
  }
  
  // Load Products with Category and Search
  function loadProducts() {
    const productsListDiv = document.getElementById('productsList');
    const categoryFilter = document.getElementById('categoryFilter');
    if (!productsListDiv || !categoryFilter) {
        console.error("Required DOM elements (productsList or categoryFilter) not found!");
        return;
    }
    productsListDiv.innerHTML = "Loading products...";
  
    db.collection('products').get()
        .then(snapshot => {
            productsListDiv.innerHTML = "";
            allProducts = []; // Reset the products array
            const categories = new Set(["All"]); // Use Set to avoid duplicates
  
            if (snapshot.empty) {
                productsListDiv.innerHTML = "No products available.";
                return;
            }
  
            snapshot.forEach(doc => {
                const prod = doc.data();
                prod.id = doc.id;
                allProducts.push(prod); // Store the product data
  
                // Populate categories
                if (prod.category) categories.add(prod.category);
  
                const imageUrl = prod.imageUrl || 'assets/images/nothing.png';
                const prodDiv = document.createElement('div');
                prodDiv.classList.add('product');
                prodDiv.setAttribute('data-id', doc.id); // Add data-id attribute for direct UI update
                prodDiv.setAttribute('data-category', prod.category || 'Uncategorized'); // Store category for filtering
                prodDiv.setAttribute('data-name', prod.name.toLowerCase()); // Store name for searching
                const isOutOfStock = (prod.quantity || 0) === 0;
                prodDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${prod.name}" width="200" onerror="this.src='assets/images/nothing.png'"/>
                    <br>
                    <strong>${prod.name}</strong> - $${prod.price}
                    <br><small>Earn Credit: ${prod.credit || 0}</small>
                    <br><small>Quantity Available: ${prod.quantity || 0}</small>
                    <br>
                    <div class="quantity-controls">
                        <button onclick="decreaseQuantity('${doc.id}')">-</button>
                        <span id="quantity-${doc.id}">1</span>
                        <button onclick="increaseQuantity('${doc.id}')">+</button>
                    </div>
                    <br><button onclick="addToCart('${doc.id}')" ${isOutOfStock ? 'disabled' : ''}>${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</button>
                    <br><button onclick="addToWishlist('${doc.id}')">Add to Wishlist</button>
                `;
                productsListDiv.appendChild(prodDiv);
            });
  
            // Populate category dropdown
            categoryFilter.innerHTML = '<option value="All">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
  
            // Initialize search and filter
            searchProducts();
        })
        .catch(err => {
            console.error("Error loading products:", err);
            productsListDiv.innerHTML = "Error loading products: " + err.message;
        });
  }
  
  // Search and Filter Products
  function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const productElements = document.querySelectorAll('.product');
  
    productElements.forEach(prodDiv => {
        const productName = prodDiv.getAttribute('data-name') || '';
        const productCategory = prodDiv.getAttribute('data-category') || '';
  
        const matchesSearch = productName.includes(searchTerm);
        const matchesCategory = categoryFilter === 'All' || productCategory === categoryFilter;
  
        if (matchesSearch && matchesCategory) {
            prodDiv.style.display = 'block';
        } else {
            prodDiv.style.display = 'none';
        }
    });
  }
  
  // Increase quantity for a product
  function increaseQuantity(productId) {
    const qtySpan = document.getElementById(`quantity-${productId}`);
    let currentQty = parseInt(qtySpan.innerText);
    qtySpan.innerText = currentQty + 1;
  }
  
  // Decrease quantity for a product (minimum 1)
  function decreaseQuantity(productId) {
    const qtySpan = document.getElementById(`quantity-${productId}`);
    let currentQty = parseInt(qtySpan.innerText);
    if (currentQty > 1) {
        qtySpan.innerText = currentQty - 1;
    }
  }
  
  // Function to notify admin about low stock
  function notifyAdmin(productName, currentQuantity) {
    const adminNotificationRef = db.collection('adminNotifications');
    adminNotificationRef.add({
        productName: productName,
        currentQuantity: currentQuantity,
        timestamp: new Date(),
        message: `Low stock alert: ${productName} has ${currentQuantity} units left. Please restock soon.`,
        read: false
    }).then(() => {
        console.log(`Notification sent for ${productName} with ${currentQuantity} units left.`);
    }).catch(err => {
        console.error("Error sending notification:", err);
    });
  }
  
  // Add to cart without updating stock
  function addToCart(productId) {
    if (!currentUser) {
        alert("Please log in to add items to cart.");
        return;
    }
  
    const qtySpan = document.getElementById(`quantity-${productId}`);
    const quantity = parseInt(qtySpan.innerText);
  
    db.collection('products').doc(productId).get()
        .then(productDoc => {
            if (!productDoc.exists) {
                alert("Product not found.");
                return;
            }
  
            const product = productDoc.data();
            const availableQuantity = product.quantity || 0;
  
            if (availableQuantity < quantity) {
                alert(`Not enough stock for ${product.name}. Only ${availableQuantity} left.`);
                return;
            }
  
            const cartRef = db.collection('cart').doc(currentUser.uid).collection('items');
            cartRef.where('productId', '==', productId).get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        // Item exists in cart, update quantity
                        const doc = snapshot.docs[0];
                        const newQty = doc.data().quantity + quantity;
                        doc.ref.update({ quantity: newQty })
                            .then(() => {
                                alert("Cart updated successfully!");
                                loadCart();
                            });
                    } else {
                        // New item, add to cart
                        cartRef.add({
                            productId: productId,
                            name: product.name,
                            price: product.price,
                            credit: product.credit,
                            imageUrl: product.imageUrl || 'assets/images/nothing.png',
                            quantity: quantity
                        }).then(() => {
                            alert("Added to cart successfully!");
                            loadCart();
                        });
                    }
                })
                .catch(err => {
                    alert("Error adding to cart: " + err.message);
                });
        })
        .catch(err => {
            alert("Error fetching product: " + err.message);
        });
  }
  
  // Increase/decrease cart quantity functions
  function increaseCartQuantity(itemId) {
    if (!currentUser) return;
  
    const qtySpan = document.getElementById(`cart-quantity-${itemId}`);
    let currentQty = parseInt(qtySpan.innerText);
    let newQty = currentQty + 1;
  
    db.collection('cart').doc(currentUser.uid).collection('items').doc(itemId).update({
        quantity: newQty
    })
    .then(() => {
        qtySpan.innerText = newQty;
        loadCart(); // Refresh cart to update totals
    })
    .catch(err => {
        console.error("Error updating quantity:", err);
    });
  }
  
  function decreaseCartQuantity(itemId) {
    if (!currentUser) return;
  
    const qtySpan = document.getElementById(`cart-quantity-${itemId}`);
    let currentQty = parseInt(qtySpan.innerText);
  
    if (currentQty > 1) {
        let newQty = currentQty - 1;
  
        db.collection('cart').doc(currentUser.uid).collection('items').doc(itemId).update({
            quantity: newQty
        })
        .then(() => {
            qtySpan.innerText = newQty;
            loadCart(); // Refresh cart to update totals
        })
        .catch(err => {
            console.error("Error updating quantity:", err);
        });
    }
  }
  
  // Load cart items with quantity controls
  function loadCart() {
    if (!currentUser) {
        alert("Please login first!");
        return;
    }
    const cartListDiv = document.getElementById('cartList');
    const totalPriceSpan = document.getElementById('totalPrice');
    const availableCreditsSpan = document.getElementById('availableCredits');
    const creditValueSpan = document.getElementById('creditValue');
    const useCreditsCheckbox = document.getElementById('useCredits');
    cartListDiv.innerHTML = "";
    let totalPrice = 0;
  
    // Fetch user's credits
    db.collection('users').doc(currentUser.uid).get().then(userDoc => {
        const userCredits = userDoc.data().credit || 0; // Credits in ₹
        const creditPoints = Math.floor(userCredits / 100); // Convert ₹ to credit points
        availableCreditsSpan.innerText = creditPoints;
        creditValueSpan.innerText = userCredits.toFixed(2);
  
        // Fetch cart items
        db.collection('cart').doc(currentUser.uid).collection('items').get()
            .then(snapshot => {
                if (snapshot.empty) {
                    cartListDiv.innerHTML = "Your cart is empty.";
                    totalPriceSpan.innerText = "0";
                    useCreditsCheckbox.disabled = true;
                    return;
                }
  
                // Process each cart item
                const promises = [];
                snapshot.forEach(doc => {
                    const item = doc.data();
  
                    // If the item doesn't have an imageUrl, fetch it from the products collection
                    if (!item.imageUrl && item.productId) {
                        const promise = db.collection('products').doc(item.productId).get()
                            .then(productDoc => {
                                if (productDoc.exists) {
                                    item.imageUrl = productDoc.data().imageUrl || 'assets/images/nothing.png';
                                }
                                return { doc, item };
                            });
                        promises.push(promise);
                    } else {
                        // If the item already has an imageUrl or no productId, just use what we have
                        item.imageUrl = item.imageUrl || 'assets/images/nothing.png';
                        promises.push(Promise.resolve({ doc, item }));
                    }
                });
  
                // Once all product images are fetched, display the cart items
                return Promise.all(promises);
            })
            .then(results => {
                if (!results || results.length === 0) return;
  
                results.forEach(({ doc, item }) => {
                    const itemTotal = item.price * item.quantity;
                    totalPrice += itemTotal;
                    const itemDiv = document.createElement('div');
                    itemDiv.classList.add('cart-item');
                    itemDiv.innerHTML = `
                        <div class="cart-item-content">
                            <img src="${item.imageUrl}" alt="${item.name}" width="80" onerror="this.src='assets/images/nothing.png'"/>
                            <div class="cart-item-details">
                                <div class="cart-item-name">${item.name}</div>
                                <div class="cart-item-price">₹${item.price}</div>
                                <div class="quantity-controls">
                                    <button onclick="decreaseCartQuantity('${doc.id}')">-</button>
                                    <span id="cart-quantity-${doc.id}">${item.quantity}</span>
                                    <button onclick="increaseCartQuantity('${doc.id}')">+</button>
                                </div>
                                <div class="cart-item-total">Total: ₹${itemTotal}</div>
                                <button class="remove-btn" onclick="removeFromCart('${doc.id}')">Remove</button>
                            </div>
                        </div>
                    `;
                    cartListDiv.appendChild(itemDiv);
                });
  
                totalPriceSpan.innerText = totalPrice.toFixed(2);
                useCreditsCheckbox.disabled = false;
                updateTotalWithCredits(); // Update total with credits if checked
            })
            .catch(err => {
                console.error("Error loading cart:", err);
                cartListDiv.innerHTML = "Error loading cart.";
            });
    });
  }
  
  // Add to Wishlist
  function addToWishlist(productId) {
    if (!currentUser.uid) {
        alert("Please login first!");
        return;
    }
  
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = doc.data();
                product.id = doc.id; // Add the product ID to the wishlist data
                const wishlistRef = db.collection('users').doc(currentUser.uid).collection('wishlist');
  
                // Check if the product is already in the wishlist
                wishlistRef.where('name', '==', product.name).get()
                    .then(snapshot => {
                        if (snapshot.empty) {
                            // Product not found in wishlist, add it
                            wishlistRef.add(product)
                                .then(() => {
                                    alert(`${product.name} added to wishlist.`);
                                    loadWishlist();
                                })
                                .catch(err => {
                                    alert(err.message);
                                });
                        } else {
                            // Product already exists in wishlist
                            alert(`${product.name} is already in your wishlist.`);
                        }
                    })
                    .catch(err => {
                        alert(err.message);
                    });
            } else {
                alert("Product not found.");
            }
        })
        .catch(err => {
            alert("Error fetching product: " + err.message);
        });
  }
  
  // Load Wishlist
  function loadWishlist() {
    if (!currentUser.uid) {
        alert("Please login first!");
        return;
    }
    const wishlistListDiv = document.getElementById('wishlistList');
    wishlistListDiv.innerHTML = "Loading wishlist...";
    db.collection('users').doc(currentUser.uid).collection('wishlist').get()
        .then(snapshot => {
            wishlistListDiv.innerHTML = "";
            if (snapshot.empty) {
                wishlistListDiv.innerHTML = "Your wishlist is empty.";
                return;
            }
            snapshot.forEach(doc => {
                const item = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('wishlist-item');
                itemDiv.innerHTML = `
                    <img src="${item.imageUrl || 'assets/images/nothing.png'}" alt="${item.name}" width="100" onerror="this.src='assets/images/nothing.png'"/>
                    <br>
                    ${item.name} - $${item.price}
                    <br>
                    <button onclick="addToCartFromWishlist('${doc.id}')">Add to Cart</button>
                    <button onclick="removeFromWishlist('${doc.id}')">Remove</button>
                `;
                wishlistListDiv.appendChild(itemDiv);
            });
        })
        .catch(err => {
            console.error("Error loading wishlist:", err);
            wishlistListDiv.innerHTML = "Error loading wishlist.";
        });
  }
  
  // Remove from Wishlist
  function removeFromWishlist(docId) {
    if (!currentUser.uid) {
        alert("Please login first!");
        return;
    }
    db.collection('users').doc(currentUser.uid).collection('wishlist').doc(docId).delete()
        .then(() => {
            alert("Item removed from wishlist!");
            loadWishlist();
        })
        .catch(err => {
            console.error("Error removing item from wishlist:", err);
            alert("Error removing item from wishlist.");
        });
  }
  
  // Add to Cart from Wishlist
  function addToCartFromWishlist(wishlistDocId) {
    if (!currentUser.uid) {
        alert("Please login first!");
        return;
    }
  
    db.collection('users').doc(currentUser.uid).collection('wishlist').doc(wishlistDocId).get()
        .then(doc => {
            if (doc.exists) {
                const item = doc.data();
                const productId = item.id;
  
                if (!productId) {
                    alert("Product ID not found in wishlist item. Please ensure the product was added correctly.");
                    return;
                }
  
                db.collection('products').doc(productId).get()
                    .then(productDoc => {
                        if (productDoc.exists) {
                            const product = productDoc.data();
                            const availableQuantity = product.quantity || 0;
  
                            if (availableQuantity < 1) {
                                alert(`Not enough stock for ${product.name}.`);
                                return;
                            }
  
                            const cartRef = db.collection('cart').doc(currentUser.uid).collection('items');
                            cartRef.where('productId', '==', productId).get()
                                .then(snapshot => {
                                    if (!snapshot.empty) {
                                        const cartDoc = snapshot.docs[0];
                                        const newQty = cartDoc.data().quantity + 1;
                                        if (newQty > availableQuantity) {
                                            alert(`Cannot add ${newQty} of ${product.name}. Only ${availableQuantity} left in stock.`);
                                            return;
                                        }
                                        cartDoc.ref.update({ quantity: newQty })
                                            .then(() => {
                                                alert("Item added to cart from wishlist!");
                                                loadCart();
                                                removeFromWishlist(wishlistDocId);
                                            });
                                    } else {
                                        cartRef.add({
                                            productId: productId,
                                            name: product.name,
                                            price: product.price,
                                            credit: product.credit,
                                            imageUrl: product.imageUrl || 'assets/images/nothing.png',
                                            quantity: 1
                                        }).then(() => {
                                            alert("Item added to cart from wishlist!");
                                            loadCart();
                                            removeFromWishlist(wishlistDocId);
                                        });
                                    }
                                })
                                .catch(err => {
                                    alert("Error adding to cart: " + err.message);
                                });
                        } else {
                            alert("Product not found in products collection. This may indicate a data mismatch.");
                        }
                    })
                    .catch(err => {
                        alert("Error fetching product: " + err.message);
                    });
            } else {
                alert("Wishlist item not found.");
            }
        })
        .catch(err => {
            alert("Error fetching wishlist item: " + err.message);
        });
  }
  
  // Update total price with credits if checkbox is checked
  function updateTotalWithCredits() {
    const useCreditsCheckbox = document.getElementById('useCredits');
    const totalPriceSpan = document.getElementById('totalPrice');
    const creditValueSpan = document.getElementById('creditValue');
    const discountAmountSpan = document.getElementById('discountAmount');
    const creditDiscountDiv = document.getElementById('creditDiscount');
    const finalTotalDiv = document.getElementById('finalTotal');
    const finalPriceSpan = document.getElementById('finalPrice');
  
    const totalPrice = parseFloat(totalPriceSpan.innerText);
    const availableCreditValue = parseFloat(creditValueSpan.innerText);
  
    if (useCreditsCheckbox.checked && availableCreditValue > 0) {
        const discount = Math.min(availableCreditValue, totalPrice);
        discountAmountSpan.innerText = discount.toFixed(2);
        creditDiscountDiv.style.display = 'block';
        finalPriceSpan.innerText = (totalPrice - discount).toFixed(2);
        finalTotalDiv.style.display = 'block';
    } else {
        creditDiscountDiv.style.display = 'none';
        finalTotalDiv.style.display = 'none';
    }
  }
  
  // Remove item from cart
  function removeFromCart(itemId) {
    if (!currentUser.uid) {
        alert("Please login first!");
        return;
    }
    db.collection('cart').doc(currentUser.uid).collection('items').doc(itemId).delete()
        .then(() => {
            alert("Item removed from cart!");
            loadCart();
        })
        .catch(err => {
            console.error("Error removing item from cart:", err);
            alert("Error removing item from cart.");
        });
  }
  
  // Enhanced Place Order function with stock update
  function placeOrder() {
      if (!currentUser || !currentUser.uid) {
          alert("Please login first!");
          return;
      }
  
      const userCartRef = db.collection('cart').doc(currentUser.uid).collection('items');
      const userRef = db.collection('users').doc(currentUser.uid);
      const billDetailsDiv = document.getElementById('billDetails');
      const creditsEarnedSpan = document.getElementById('creditsEarned');
      const useCreditsCheckbox = document.getElementById('useCredits');
      const totalPriceSpan = document.getElementById('totalPrice');
      const discountAmountSpan = document.getElementById('discountAmount');
  
      // Validate DOM elements
      if (!billDetailsDiv || !creditsEarnedSpan || !useCreditsCheckbox || !totalPriceSpan || !discountAmountSpan) {
          console.error("Required DOM elements missing!");
          alert("Error: Unable to load billing page. Please refresh and try again.");
          return;
      }
  
      // Fetch user details
      userRef.get().then(userDoc => {
          if (!userDoc.exists) {
              alert("User profile not found!");
              return;
          }
  
          const userData = userDoc.data();
          const userEmail = userData.email || "No email provided";
          const shippingAddress = userData.address || "Default Shipping Address";
  
          // Fetch cart items
          userCartRef.get().then(snapshot => {
              let cartItems = [];
              let totalPrice = 0;
              let totalCredit = 0;
  
              if (snapshot.empty) {
                  alert("Your cart is empty!");
                  return;
              }
  
              snapshot.forEach(doc => {
                  const item = doc.data();
                  cartItems.push(item);
                  totalPrice += item.price * item.quantity;
                  totalCredit += (item.credit || 0) * item.quantity; // Handle undefined credit
              });
  
              // Calculate credit discount if used
              let discount = 0;
              let finalAmount = totalPrice;
              if (useCreditsCheckbox.checked) {
                  const availableCredits = parseFloat(document.getElementById('creditValue').innerText) || 0;
                  discount = Math.min(availableCredits, totalPrice);
                  finalAmount = totalPrice - discount;
              }
  
              // Calculate GST (assuming 18%)
              const gstAmount = (finalAmount * 0.18).toFixed(2);
              const subTotal = (finalAmount - parseFloat(gstAmount)).toFixed(2);
  
              // Generate order details
              const orderNumber = "ST" + Math.floor(100000 + Math.random() * 900000);
              const currentDate = new Date();
              const deliveryDate = new Date(currentDate);
              deliveryDate.setDate(deliveryDate.getDate() + 5);
  
              // Batch update for stock and order history
              const batch = db.batch();
              const historyRef = db.collection('users').doc(currentUser.uid).collection('history').doc();
              const orderId = historyRef.id;
  
              // Update stock for each item in the cart
              cartItems.forEach(item => {
                  const productRef = db.collection('products').doc(item.productId);
                  batch.update(productRef, {
                      quantity: firebase.firestore.FieldValue.increment(-item.quantity)
                  }); // No .catch here
              });
  
              // Save order to the user's history
              batch.set(historyRef, {
                  userEmail: userEmail,
                  orderNumber: orderNumber,
                  items: cartItems,
                  totalPrice: totalPrice,
                  totalCredit: totalCredit,
                  creditDiscount: discount,
                  subTotal: parseFloat(subTotal),
                  gstAmount: parseFloat(gstAmount),
                  finalAmount: finalAmount,
                  shippingAddress: shippingAddress,
                  orderDate: currentDate,
                  estimatedDelivery: deliveryDate,
                  paymentMethod: "Online Payment",
                  status: "order received"
              });
  
              // Commit the batch
              batch.commit().then(() => {
                  // Update UI with billing information
                  creditsEarnedSpan.innerText = totalCredit;
                  billDetailsDiv.innerHTML = generateBillContent(orderId, orderNumber, currentDate, deliveryDate, userEmail, shippingAddress, cartItems, subTotal, gstAmount, discount, finalAmount, totalCredit);
                  document.getElementById('billSection').style.display = 'block';
  
                  // Update user credits
                  const creditValueEarned = totalCredit * 100;
                  const newCredit = (userData.credit || 0) - discount + creditValueEarned;
                  userRef.update({ credit: newCredit }).catch(err => {
                      console.error("Error updating user credits:", err);
                  });
  
                  // Clear cart
                  snapshot.forEach(doc => doc.ref.delete().catch(err => {
                      console.error("Error clearing cart item:", err);
                  }));
  
                  alert("Order placed successfully! View your invoice below.");
                  loadCart(); // Refresh cart
                  loadProducts(); // Refresh product list
                  loadHistory(); // Refresh history
              }).catch(err => {
                  console.error("Error committing batch:", err);
                  alert("Error processing cart. Please try again. (Details: " + err.message + ")");
              });
          }).catch(err => {
              console.error("Error fetching cart:", err);
              alert("Error processing cart. Please try again. (Details: " + err.message + ")");
          });
      }).catch(err => {
          console.error("Error fetching user data:", err);
          alert("Error processing cart. Please try again. (Details: " + err.message + ")");
      });
  }
  // Helper function to generate bill content
  function generateBillContent(orderId, orderNumber, orderDate, deliveryDate, userEmail, shippingAddress, cartItems, subTotal, gstAmount, discount, finalAmount, totalCredit) {
    return `
        <div class="invoice-container">
            <div class="invoice-header">
                <div class="logo-container">
                    <h1>A2Z</h1>
                    <p>Your  Shopping Destination</p>
                </div>
                <div class="invoice-details">
                    <h2>INVOICE</h2>
                    <table>
                        <tr><td><strong>Invoice No:</strong></td><td>${orderNumber}</td></tr>
                        <tr><td><strong>Order ID:</strong></td><td>${orderId}</td></tr>
                        <tr><td><strong>Order Date:</strong></td><td>${orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                        <tr><td><strong>Est. Delivery:</strong></td><td>${deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                    </table>
                </div>
            </div>
  
            <div class="customer-details">
                <div class="billing-details">
                    <h3>BILLING ADDRESS</h3>
                    <p>${userEmail}</p>
                    <p>${shippingAddress}</p>
                </div>
                <div class="shipping-details">
                    <h3>SHIPPING ADDRESS</h3>
                    <p>${userEmail}</p>
                    <p>${shippingAddress}</p>
                </div>
            </div>
  
            <div class="order-summary">
                <h3>ORDER SUMMARY</h3>
                <table class="bill-table">
                    <thead><tr><th>S.No</th><th>Image</th><th>Product</th><th>Unit Price</th><th>Quantity</th><th>Net Amount</th></tr></thead>
                    <tbody>
                        ${cartItems.map((item, index) => {
                            const itemTotal = item.price * item.quantity;
                            const imageUrl = item.imageUrl || 'assets/images/nothing.png';
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><img src="${imageUrl}" alt="${item.name}" width="60" onerror="this.src='assets/images/nothing.png'"/></td>
                                    <td><p class="product-name">${item.name}</p><p class="product-sku">SKU: PROD${Math.floor(1000 + Math.random() * 9000)}</p></td>
                                    <td>₹${item.price.toLocaleString('en-IN')}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${itemTotal.toLocaleString('en-IN')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
  
            <div class="price-summary">
                <table class="price-details">
                    <tr><td>Subtotal:</td><td>₹${subTotal.toLocaleString('en-IN')}</td></tr>
                    <tr><td>GST (18%):</td><td>₹${parseFloat(gstAmount).toLocaleString('en-IN')}</td></tr>
                    <tr><td>Shipping:</td><td>FREE</td></tr>
                    ${discount > 0 ? `<tr><td>Credit Discount:</td><td>-₹${discount.toLocaleString('en-IN')}</td></tr>` : ''}
                    <tr class="total-row"><td>Total Amount:</td><td>₹${finalAmount.toLocaleString('en-IN')}</td></tr>
                </table>
            </div>
  
            <div class="payment-info">
                <h3>PAYMENT INFORMATION</h3>
                <p><strong>Payment Method:</strong> Online Payment</p>
                <p><strong>Transaction ID:</strong> TXN${Math.floor(100000 + Math.random() * 900000)}</p>
                <p><strong>Credits Earned:</strong> ${totalCredit} (₹${(totalCredit * 100).toLocaleString('en-IN')})</p>
            </div>
  
            <div class="invoice-footer">
                <div class="footer-content">
                    <p>Thank you for shopping with A2Z!</p>
                   
            </div>
        </div>
    `;
  }
  
  // Enhanced Print Bill function for better printing
  function printBill() {
    const billSection = document.getElementById('billDetails').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>A2Z - Invoice</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Poppins', sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                    .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; }
                    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; }
                    .logo-container h1 { margin: 0; color: #6a11cb; }
                    .logo-container p { margin: 5px 0; color: #666; }
                    .invoice-details { text-align: right; }
                    .invoice-details h2 { color: #6a11cb; margin-top: 0; }
                    .invoice-details table { width: 100%; }
                    .invoice-details td { padding: 3px 0; }
                    .customer-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .billing-details, .shipping-details { width: 48%; }
                    h3 { color: #6a11cb; font-size: 16px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0; }
                    .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .bill-table th { background-color: #f5f5f5; color: #333; padding: 10px; text-align: left; font-weight: 500; }
                    .bill-table td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
                    .product-name { font-weight: 500; margin: 0 0 5px 0; }
                    .product-sku { font-size: 12px; color: #666; margin: 0; }
                    .price-details { width: 300px; margin-left: auto; margin-bottom: 30px; }
                    .price-details td { padding: 8px 0; }
                    .price-details td:first-child { text-align: left; }
                    .price-details td:last-child { text-align: right; font-weight: 500; }
                    .total-row { font-size: 18px; font-weight: 600; color: #6a11cb; }
                    .payment-info { margin-bottom: 30px; }
                    .invoice-footer { border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; font-size: 14px; color: #666; }
                    .terms { margin-top: 20px; font-size: 12px; }
                    @media print { body { padding: 0; font-size: 12px; } button { display: none; } }
                </style>
            </head>
            <body>
                ${billSection}
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background-color: #6a11cb; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Invoice</button>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
    }, 500);
  }
  
  // Enhanced Load History function to show improved invoices
  function loadHistory() {
    if (!currentUser || !currentUser.uid) {
        alert("Please login first!");
        return;
    }
  
    const historyListDiv = document.getElementById('historyList');
    if (!historyListDiv) {
        console.error("History list div not found in the DOM!");
        return;
    }
  
    historyListDiv.innerHTML = "<p>Loading your order history...</p>";
  
    db.collection('users')
        .doc(currentUser.uid)
        .collection('history')
        .orderBy("orderDate", "desc")
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                historyListDiv.innerHTML = "<p class='empty-message'>No order history available.</p>";
                return;
            }
  
            historyListDiv.innerHTML = ""; // Clear loading message
  
            snapshot.forEach(doc => {
                const order = doc.data();
                const orderId = doc.id;
  
                // Format order date
                const orderDate = order.orderDate && order.orderDate.toDate
                    ? order.orderDate.toDate().toLocaleString()
                    : new Date(order.orderDate).toLocaleString();
  
                // Format delivery date
                const deliveryDate = order.estimatedDelivery && order.estimatedDelivery.toDate
                    ? order.estimatedDelivery.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : "Not available";
  
                // Create a div for each order
                const orderDiv = document.createElement('div');
                orderDiv.classList.add('order-history-item');
                orderDiv.innerHTML = `
                    <div class="order-summary-card">
                        <div class="order-header">
                            <div class="order-basic-info">
                                <h3>Order #${order.orderNumber || 'N/A'}</h3>
                                <p>Placed on: ${orderDate}</p>
                                <p>Status: <span class="order-status">${order.status || 'order received'}</span></p>
                            </div>
                            <div class="order-amount">
                                <p>Total: ₹${order.finalAmount ? order.finalAmount.toLocaleString('en-IN') : 'N/A'}</p>
                            </div>
                        </div>
  
                        <div class="order-preview">
                            ${order.items.slice(0, 3).map(item => {
                                const imageUrl = item.imageUrl || 'assets/images/nothing.png';
                                return `<img src="${imageUrl}" alt="${item.name}" width="60" onerror="this.src='assets/images/nothing.png'"/>`;
                            }).join('')}
                            ${order.items.length > 3 ? `<span class="more-items">+${order.items.length - 3} more</span>` : ''}
                        </div>
  
                        <div id="order-details-${orderId}" class="order-details" style="display: none;">
                            <h4>Order Items</h4>
                            <table class="order-items-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => {
                                        const itemTotal = item.price * item.quantity;
                                        const imageUrl = item.imageUrl || 'assets/images/nothing.png';
                                        return `
                                            <tr>
                                                <td>
                                                    <div class="product-info">
                                                        <img src="${imageUrl}" alt="${item.name}" width="50" onerror="this.src='assets/images/nothing.png'"/>
                                                        <span>${item.name}</span>
                                                    </div>
                                                </td>
                                                <td>₹${item.price.toLocaleString('en-IN')}</td>
                                                <td>${item.quantity}</td>
                                                <td>₹${itemTotal.toLocaleString('en-IN')}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
  
                            <div class="order-address">
                                <div class="delivery-info">
                                    <h4>Delivery Information</h4>
                                    <p><strong>Expected Delivery:</strong> ${deliveryDate}</p>
                                    <p><strong>Shipping Address:</strong><br>${order.shippingAddress || 'Default Shipping Address'}</p>
                                </div>
  
                                <div class="payment-info">
                                    <h4>Payment Information</h4>
                                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Online Payment'}</p>
                                    <p><strong>Subtotal:</strong> ₹${order.subTotal ? order.subTotal.toLocaleString('en-IN') : order.finalAmount.toLocaleString('en-IN')}</p>
                                    ${order.gstAmount ? `<p><strong>GST:</strong> ₹${order.gstAmount.toLocaleString('en-IN')}</p>` : ''}
                                    ${order.creditDiscount > 0 ? `<p><strong>Credit Discount:</strong> ₹${order.creditDiscount.toLocaleString('en-IN')}</p>` : ''}
                                    <p><strong>Total Amount:</strong> ₹${order.finalAmount.toLocaleString('en-IN')}</p>
                                    <p><strong>Credits Earned:</strong> ${order.totalCredit}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
  
                historyListDiv.appendChild(orderDiv);
            });
        })
        .catch(err => {
            console.error("Error loading history:", err);
            historyListDiv.innerHTML = `<p class='error-message'>Error loading order history: ${err.message}</p>`;
        });
  }
  
  // Navigation function (unchanged)
  function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'cart') loadCart();
    if (sectionId === 'history') loadHistory();
    if (sectionId === 'wishlist') loadWishlist();
  }
  
  // Function to revert back to the Login form
  function showLogin(event) {
    event.preventDefault();
    const loginFormContainer = document.querySelector('#login .form-container');
    loginFormContainer.innerHTML = `
        <h2>Login</h2>
        <form id="loginForm">
            <input type="email" id="loginEmail" placeholder="Email" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <select id="loginRole" required>
                <option value="" disabled selected>Select Role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
            <button type="submit" class="btn">Login</button>
        </form>
        <div id="loginMessage" class="message"></div>
        <div class="new-user">
            New user? <a href="#signup" onclick="showSignUp(event)" class="signup-link">Sign Up</a>
        </div>
    `;
  
    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const role = document.getElementById('loginRole').value;
  
        auth.signInWithEmailAndPassword(email, password)
            .then(cred => {
                currentUser = cred.user;
                document.getElementById('loginMessage').innerText = "Login successful!";
  
                if (role === "admin" && email === "ajay@gmail.com") {
                    window.location.href = "admin.html";
                } else if (role === "user") {
                    document.body.setAttribute('data-theme', 'light');
                    createMouseTail();
                    showSection('products');
                } else {
                    document.getElementById('loginMessage').innerText = "Not authorized as admin.";
                    auth.signOut();
                }
            })
            .catch(err => {
                document.getElementById('loginMessage').innerText = err.message;
            });
    });
  }
  
  // Logout
  function logout() {
    auth.signOut().then(() => {
        currentUser = { uid: null, role: null };
        alert("Logged out successfully.");
        showSection('home');
    });
  }
  
  // Login handler
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
  
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser.uid = userCredential.user.uid;
            currentUser.role = role; // Set role from login form
            // Save role and initialize credit in Firestore
            db.collection('users').doc(currentUser.uid).set({
                role: role,
                credit: 0 // Initialize credit if needed
            }, { merge: true })
            .then(() => {
                console.log("Logged in as:", email, "with role:", role);
                if (role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    showSection('products');
                }
            })
            .catch(err => {
                document.getElementById('loginMessage').innerText = `Error: ${err.message}`;
            });
        })
        .catch(err => {
            document.getElementById('loginMessage').innerText = `Error: ${err.message}`;
        });
  });
  
  // Monitor authentication state
  auth.onAuthStateChanged(user => {
    if (user) {
        currentUser.uid = user.uid;
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                currentUser.role = doc.data().role || 'user';
                if (currentUser.role === 'admin') {
                    window.location.href = 'admin.html'; // Redirect to admin page if already logged in as admin
                } else {
                    showSection('home'); // Default to home for users
                }
            })
            .catch(err => console.error("Error fetching user role:", err));
    } else {
        currentUser = { uid: null, role: null };
        showSection('home'); // Default to home when logged out
    }
  });
  
  // Add event listener for Wishlist section
  document.addEventListener('DOMContentLoaded', () => {
    const wishlistLink = document.querySelector('.nav-link[onclick^="showSection(\'wishlist\'"]');
    if (wishlistLink) {
        wishlistLink.addEventListener('click', () => {
            loadWishlist();
        });
    }
  });
// --- CONFIG ---
const CONTRACT_ADDRESS = "0xcfC977e7feEdC5d3D75707F53170870Cee1FD4A0";
const CONTRACT_ABI = [
    "function currentDrawNumber() view returns (uint256)",
    "function buyTicket() payable",
    "function getTicketOwner(uint256,uint256) view returns (address)",
    "function getMyTickets(uint256) view returns (uint256[] memory)",
    "function TICKETS_PER_DRAW() view returns (uint256)",
    "function TICKET_PRICE() view returns (uint256)",
    "function WINNER_PRIZE() view returns (uint256)",
    "function CREATOR_PRIZE() view returns (uint256)",
    "event TicketPurchased(address indexed buyer, uint256 drawNumber, uint256 ticketNumber)",
    "event DrawStarted(uint256 drawNumber)",
    "event DrawCompleted(uint256 drawNumber, address winner, uint256 winningTicket)",
    "event DrawTimedOut(uint256 drawNumber)"
];
const TICKETS_PER_DRAW = 16;
const TICKET_PRICE = 0.5;
const IMAGE_URL = "mon ticket.png";

// --- STATE ---
let provider, signer, contract, userAddress;

// --- DOM Elements ---
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletAddressDiv = document.getElementById('walletAddress');
const ticketGrid = document.getElementById('ticketGrid');
const drawNumberSpan = document.getElementById('drawNumber');
const ticketsSoldSpan = document.getElementById('ticketsSold');
const ownedTicketsList = document.getElementById('ownedTickets');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');
const winnerInfo = document.getElementById('winnerInfo');
const countdownDiv = document.getElementById('countdown');

// --- WALLET CONNECT ---
connectWalletBtn.onclick = async () => {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        walletAddressDiv.textContent = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        connectWalletBtn.style.display = 'none';
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        await refreshUI();
    } else {
        alert("Please install MetaMask or another wallet.");
    }
};

// --- UI LOGIC ---
async function refreshUI() {
    if (!contract) return;
    const drawNumber = await contract.currentDrawNumber();
    drawNumberSpan.textContent = drawNumber;

    // Fetch all ticket owners in parallel
    const ownerPromises = [];
    for (let i = 1; i <= TICKETS_PER_DRAW; i++) {
        ownerPromises.push(contract.getTicketOwner(drawNumber, i));
    }
    const owners = await Promise.all(ownerPromises);

    // Find owned tickets for the user
    let ownedTickets = [];
    let sold = 0;
    for (let i = 0; i < TICKETS_PER_DRAW; i++) {
        if (owners[i] && owners[i] !== "0x0000000000000000000000000000000000000000") {
            sold++;
            if (userAddress && owners[i].toLowerCase() === userAddress.toLowerCase()) {
                ownedTickets.push(i + 1);
            }
        }
    }
    ticketsSoldSpan.textContent = sold;
    renderTicketGrid(owners, ownedTickets);
    renderOwnedTickets(ownedTickets);
    // TODO: Add countdown and winner logic
}

function renderTicketGrid(owners, ownedTickets) {
    ticketGrid.innerHTML = '';
    for (let i = 1; i <= TICKETS_PER_DRAW; i++) {
        const ticketDiv = document.createElement('div');
        ticketDiv.className = 'ticket';
        ticketDiv.innerHTML = `
            <div class="ticketNumber">#${i}</div>
            <img src="${IMAGE_URL}" alt="Ticket">
        `;
        const owner = owners[i - 1];
        if (owner && owner !== "0x0000000000000000000000000000000000000000") {
            if (userAddress && owner.toLowerCase() === userAddress.toLowerCase()) {
                ticketDiv.classList.add('owned');
                ticketDiv.innerHTML += '<div>Owned</div>';
            } else {
                ticketDiv.classList.add('sold');
                ticketDiv.innerHTML += '<div>Sold</div>';
            }
        } else {
            const buyBtn = document.createElement('button');
            buyBtn.className = 'buyBtn';
            buyBtn.textContent = 'Buy Now';
            buyBtn.onclick = () => buyTicket();
            ticketDiv.appendChild(buyBtn);
        }
        ticketGrid.appendChild(ticketDiv);
    }
}

function renderOwnedTickets(ownedTickets) {
    ownedTicketsList.innerHTML = '';
    if (ownedTickets.length === 0) {
        ownedTicketsList.innerHTML = '<li>No tickets owned yet.</li>';
    } else {
        ownedTickets.forEach(num => {
            const li = document.createElement('li');
            li.textContent = `Ticket #${num}`;
            ownedTicketsList.appendChild(li);
        });
    }
}

async function buyTicket() {
    if (!contract) return;
    try {
        const tx = await contract.buyTicket({ value: ethers.parseEther(TICKET_PRICE.toString()) });
        await tx.wait();
        await refreshUI();
    } catch (e) {
        alert('Transaction failed: ' + (e.message || e));
    }
}

// --- INIT ---
// Optionally, auto-connect if wallet already connected
if (window.ethereum && window.ethereum.selectedAddress) {
    connectWalletBtn.click();
} 

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 21, 2026 at 04:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `241685cabunocdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `241685cabunocusers`
--

CREATE TABLE `241685cabunocusers` (
  `Id` int(11) NOT NULL,
  `FullName` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Username` varchar(100) DEFAULT NULL,
  `Status` varchar(50) DEFAULT 'Active',
  `Role` varchar(50) DEFAULT 'User',
  `JoinedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `LastActive` varchar(50) DEFAULT 'Just now'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `241685cabunocusers`
--

INSERT INTO `241685cabunocusers` (`Id`, `FullName`, `Email`, `Password`, `Username`, `Status`, `Role`, `JoinedDate`, `LastActive`) VALUES
(3, '123', '312313@qrq', '123', '213', 'Active', 'Admin', '2026-04-20 22:36:14', 'Just now'),
(4, '124', '312313@qrqdq', '123', '241', 'Inactive', 'User', '2026-04-20 22:36:36', 'Just now'),
(6, '123', '132@4114', '123', '312313@qrqdq', 'Active', 'User', '2026-04-21 11:09:39', 'Just now'),
(7, '123', '123@123', '123', '312313@qrqdq', 'Active', 'User', '2026-04-21 11:14:15', 'Just now'),
(8, 'josh', 'ljcabunoc03@gmailcom', '123', '312313@qrqdqq', 'Active', 'User', '2026-04-21 12:35:17', 'Just now');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `241685cabunocusers`
--
ALTER TABLE `241685cabunocusers`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Email` (`Email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `241685cabunocusers`
--
ALTER TABLE `241685cabunocusers`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

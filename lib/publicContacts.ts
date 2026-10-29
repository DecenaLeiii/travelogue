export type PublicContact = {
  region: string;
  contact?: string;
  title?: string;
  address?: string;
  phone?: string;
  tourist?: string;
  airport?: string;
  fax?: string;
  email?: string;
  website?: string;
};

export const DEFAULT_PUBLIC_CONTACTS: PublicContact[] = [
  { region: 'National Capital Region (NCR)', contact: 'Catherine C. Agustin', title: 'Director, NCR Regional Office', address: '6783 20th Floor Robinsons Summit Center (RSC), Ayala Ave., Makati Central Business District, Makati City, 1227', phone: '(02) 8459-5200 to 5230 loc. 212', tourist: '(02) 8459-5200 to 5230 loc. 102', email: 'dotncr@tourism.gov.ph / dot.ncr@gmail.com' },
  { region: 'Cordillera Administrative Region (CAR)', contact: 'Jovita A. Ganongan', title: 'Director, CAR Regional Office', address: 'Baguio Tourism Complex Barangay Governor Pack, Governor Pack Road, Baguio City 2600', phone: '(074) 309-8204 / (074) 442-7014', email: 'dot.car@tourism.gov.ph' },
  { region: 'Regional Office I (North Luzon Region)', contact: 'Benjamin D. Manahan Jr', title: 'Director, Regional Office I', address: '2nd Nisce Business Center Building, Quezon Avenue, Barangay Catbangen, City of San Fernando, La Union, 2500', phone: '(072) 888-2098', fax: '(072) 888-2098', email: 'dot1@tourism.gov.ph / dotregion1.gmail.com' },
  { region: 'Regional Office II (Cagayan Region)', contact: 'Troy Alexander G. Miano', title: 'Director, Regional Office II', address: 'No. 02 Dalan na Pav-vurulun Regional Government Center Carig Sur, Tuguegarao City, Cagayan, 3500', phone: '(078) 373-9563', fax: '(078) 304-1499 / (078) 304-1503', email: 'dot2@tourism.gov.ph / cvtourism2@gmail.com' },
  { region: 'Regional Office III (Central Luzon)', contact: 'Richard G. Daenos', title: 'Director, Regional Office III', address: 'Ground Floor, Clark Center Two-2, Clark Center, Jose Abad Santos Avenue, Berthaphil II, Clark Freeport Zone, Pampanga, 2010', phone: '0918-9464586 / 0917-506-221 / 0917-500-8351', fax: '(072) 888-2098', email: 'dot3@tourism.gov.ph / dot.centraluzon@gmail.com' },
  { region: 'Regional Office IV-A (CALABARZON)', contact: 'Marites T. Castro', title: 'Director, Regional Office IV-A', address: 'G/F Dencris Business Center, Manila South Road, Brgy. Halang, Calamba City, Laguna, 4027', phone: '(049) 254-0265', fax: '(049) 508-0760 / 508-0741', email: 'dotcalabarzon@tourism.gov.ph / dot.calabarzon@gmail.com' },
  { region: 'Regional Office IV-B (MIMAROPA)', contact: 'Roberto P. Alabado III', title: 'OIC Director, Regional Office IV-B', address: '5th Floor NEX 54 Building, 778 Boni Avenue corner EDSA, Barangka Ilaya, Mandaluyong City, 1550', phone: '(02) 873-5597', email: 'dot4b@tourism.gov.ph / dot4b.official2@tourism.gov.ph' },
  { region: 'Regional Office V (Bicol Region)', contact: 'Herbie B. Aguas', title: 'Director, Regional Office V', address: 'Regional Center Site, Rawis, Legazpi City, 4500', phone: '(052) 742-5004 / 0917 152 3254 (Admin) / 0917 890 6571 (Finance)', fax: '(049) 508-0760 / 508-0741', email: 'dot5@tourism.gov.ph / bicol.dot@gmail.com', website: 'www.wowbicol.com' },
  { region: 'Regional Office VI (Western Visayas Region)', contact: 'Crisanta Marlene P. Rodriguez', title: 'Director, Regional Office VI', address: 'Ground Floor, Casa Real de Iloilo (Old Provincial Capitol), Barangay Danao, Iloilo City / 2nd Floor Nirvana Resort, Malay, Aklan', phone: '(033) 321-7811', fax: '(033) 335-0245', email: 'dotreg6@tourism.gov.ph / deptour6@yahoo.com / dotr6boracay@gmail.com' },
  { region: 'Regional Office VII (Central Visayas Region)', contact: 'Gelena N. Asis-Dimpas, EnP', title: 'OIC-Director, Regional Office VII', address: 'Ground Floor LDM Building, Legaspi Street, Barangay San Roque (Ciudad), Cebu City, Cebu', phone: '(032) 412-1967 / (032) 407-2781 / (032) 254-2811', airport: '(032) 494-7000 L 7548', fax: '(033) 335-0245', email: 'dot7@tourism.gov.ph / dotregion7@gmail.com' },
  { region: 'Regional Office VIII (Eastern Visayas Region)', contact: 'Karina Rosa S. Tiopes', title: 'Director, Regional Office VIII', address: 'Brgy. 25 Kanhuraw Hill, Magsaysay Blvd., Tacloban City, Leyte, Philippines 6500', phone: '(053) 830-3700', fax: '(6353) 832-0901', email: 'dot8@tourism.gov.ph / dotreg8@yahoo.com' },
  { region: 'Regional Office IX (Zamboanga Peninsula Region)', contact: 'Dara May L. Cataluña, JD, MDMG', title: 'Director, Regional Office IX', address: 'GF Samboangan Bayanihan Cooperative Building, Gen. Vicente Alvarez Street, corner Claveria Street, Barangay Zone IV Zamboanga City, 7000', phone: '(062) 993-0030', fax: '(062) 955-2477', email: 'dot9@tourism.gov.ph' },
  { region: 'Regional Office X (Northern Mindanao Region)', contact: 'Marie Elaine S. Unchuan', title: 'Director, Regional Office X', address: 'Rosario Crescent St., Limketkai Center, Cagayan de Oro City, 9000', fax: '(088) 856-4048', email: 'dot10@tourism.gov.ph / dot10_nm@yahoo.com' },
  { region: 'Regional Office XI (Southern Mindanao Region)', contact: 'Tanya Virginia P. Rabat-tan', title: 'Director, Regional Office XI', address: 'Unit 1 to 5, Ground Floor COPE Development Corporation Brgy 34-D, C.M Recto St., Davao City, 8000', phone: '(082) 237-9275', fax: '(082) 225 1940', email: 'dot11@tourism.gov.ph / dot11mpd@gmail.com' },
  { region: 'Regional Office XII (South Central Mindanao Region)', contact: 'Nelia R. Arina', title: 'Director, Regional Office XII', address: 'Ground Floor Sanle Building, Benigno Aquino cor. Lapu-Lapu Street, Zone III, Koronadal, 9506', phone: '(063) 520-1274', fax: '(083) 228-8667', email: 'dot12@tourism.gov.ph / tourism@dot12.org' },
  { region: 'Regional Office XIII (Caraga Region)', contact: 'Ivonnie B. Dumadag', title: 'Director, Regional Office XIII', address: 'P-6, Barangay Villa Kananga, Butuan City', phone: '(085) 817-2085', fax: '(085) 815 6040', email: 'dot13@tourism.gov.ph / dot13@yahoo.com' },
];

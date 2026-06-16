import React from 'react';

export default function Contact() {
  const offices = [
    {
      region: 'NATIONAL CAPITAL REGION (NCR)',
      contact: 'Catherine C. Agustin',
      title: 'Director, NCR Regional Office',
      address:
        '6783 20th Floor Robinsons Summit Center (RSC), Ayala Ave., Makati Central Business District, Makati City, 1227',
      phone: 'Tel. No.: (02) 8459-5200 to 5230 loc. 212',
      tourist: 'Tourist Information Center: (02) 8459-5200 to 5230 loc. 102',
      email: 'dotncr@tourism.gov.ph / dot.ncr@gmail.com'
    },
    {
      region: 'CORDILLERA ADMIN. REGION (CAR)',
      contact: 'Jovita A. Ganongan',
      title: 'Director, CAR Regional Office',
      address:
        'Baguio Tourism Complex Barangay Governor Pack, Governor Pack Road, Baguio City 2600',
      phone: 'Tel. No.: (074) 309-8204 / (074) 442-7014',
      email: 'dot.car@tourism.gov.ph'
    },
    {
      region: 'REGIONAL OFFICE I (NORTH LUZON REGION)',
      contact: 'Benjamin D. Manahan Jr',
      title: 'Director, Regional Office I',
      address:
        '2nd Nisce Business Center Building, Quezon Avenue, Barangay Catbangen, City of San Fernando, La Union, 2500',
      phone: 'Tel. No.: (072) 888-2098',
      fax: 'Fax: (072) 888-2098',
      email: 'dot1@tourism.gov.ph / dotregion1.gmail.com'
    },
    {
      region: 'REGIONAL OFFICE II (CAGAYAN REGION)',
      contact: 'Troy Alexander G. Miano',
      title: 'Director, Regional Office II',
      address:
        'No. 02 Dalan na Pav-vurulun Regional Government Center Carig Sur, Tuguegarao City, CAGAYAN, 3500',
      phone: 'Tel. No.: (078) 373-9563',
      fax: 'Fax: (078) 304-1499 / (078) 304-1503',
      email: 'dot2@tourism.gov.ph / cvtourism2@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE III (CENTRAL LUZON)',
      contact: 'Richard G. Daenos',
      title: 'Director, Regional Office III',
      address:
        'Ground Floor, Clark Center Two-2, Clark Center, Jose Abad Santos Avenue, Berthaphil II, Clark Freeport Zone, Pampanga, 2010',
      phone: 'Tel. No.: 0918-9464586 / 0917-506-221 / 0917-500-8351',
      fax: 'Fax: (072) 888-2098',
      email: 'dot3@tourism.gov.ph / dot.centraluzon@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE IV - A (CALABARZON)',
      contact: 'Marites T. Castro',
      title: 'Director, Regional Office IV-A',
      address:
        'G/F Dencris Business Center, Manila South Road, Brgy. Halang, Calamba City, Laguna, 4027',
      phone: 'Tel. No.: (049) 254-0265',
      fax: 'Fax: (049) 508-0760 / 508-0741',
      email: 'dotcalabarzon@tourism.gov.ph / dot.calabarzon@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE IV - B (MIMAROPA)',
      contact: 'Roberto P. Alabado III',
      title: 'OIC – Director, Regional Office IV-B',
      address:
        '5th Floor NEX 54 Building, 778 Boni Avenue corner EDSA, Barangka Ilaya, Mandaluyong City, 1550',
      phone: 'Tel. No.: (02) 873-5597',
      email: 'dot4b@tourism.gov.ph / dot4b.official2@tourism.gov.ph'
    },
    {
      region: 'REGIONAL OFFICE V (BICOL REGION)',
      contact: 'Herbie B. Aguas',
      title: 'Director, Regional Office V',
      address: 'Regional Center Site, Rawis, Legazpi City, 4500',
      phone:
        'Tel. No.: (052) 742-5004 / 0917 152 3254 (Admin) / 0917 890 6571 (Finance)',
      fax: 'Fax: (049) 508-0760 / 508-0741',
      email: 'dot5@tourism.gov.ph / bicol.dot@gmail.com',
      website: 'www.wowbicol.com'
    },
    {
      region: 'REGIONAL OFFICE VI (WESTERN VISAYAS REGION)',
      contact: 'Crisanta Marlene P. Rodriguez',
      title: 'Director, Regional Office VI',
      address:
        'Ground Floor, Casa Real de Iloilo (Old Provincial Capitol), Barangay Danao, Iloilo City / 2nd Floor Nirvana Resort, Malay, Aklan',
      phone: 'Tel. No.: (033) 321-7811',
      fax: 'Fax: (033) 335-0245',
      email: 'dotreg6@tourism.gov.ph / deptour6@yahoo.com / dotr6boracay@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE VII (CENTRAL VISAYAS REGION)',
      contact: 'Gelena N. Asis-Dimpas, EnP',
      title: 'OIC-Director, Regional Office VII',
      address:
        'Ground Floor LDM Building, Legaspi Street, Barangay San Roque (Ciudad), Cebu City, Cebu',
      phone: 'Tel. No.: (032) 412-1967 / (032) 407-2781 / (032) 254-2811',
      airport: 'Airport Office : (032) 494-7000 L 7548',
      fax: 'Fax: (033) 335-0245',
      email: 'dot7@tourism.gov.ph / dotregion7@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE VIII (EASTERN VISAYAS REGION)',
      contact: 'Karina Rosa S. Tiopes',
      title: 'Director, Regional Office VIII',
      address: 'Brgy. 25 Kanhuraw Hill, Magsaysay Blvd., Tacloban City, Leyte, Philippines 6500',
      phone: 'Tel. No.: (053) 830-3700',
      fax: 'Fax: (6353) 832-0901',
      email: 'dot8@tourism.gov.ph / dotreg8@yahoo.com'
    },
    {
      region: 'REGIONAL OFFICE IX (ZAMBOANGA PENINSULA REGION)',
      contact: 'Dara May L. Cataluña, JD, MDMG',
      title: 'Director, Regional Office IX',
      address:
        'GF Samboangan Bayanihan Cooperative Building, Gen. Vicente Alvarez Street, corner Claveria Street, Barangay Zone IV Zamboanga City, 7000',
      phone: 'Tel No.: (062) 993-0030',
      fax: 'Fax: (062) 955-2477',
      email: 'dot9@tourism.gov.ph'
    },
    {
      region: 'REGIONAL OFFICE X (NORTHERN MINDANAO REGION)',
      contact: 'Marie Elaine S. Unchuan',
      title: 'Director, Regional Office X',
      address: 'Rosario Crescent St., Limketkai Center, Cagayan de Oro City, 9000',
      fax: 'Fax: (088) 856-4048',
      email: 'dot10@tourism.gov.ph / dot10_nm@yahoo.com'
    },
    {
      region: 'REGIONAL OFFICE XI (SOUTHERN MINDANAO REGION)',
      contact: 'Tanya Virginia P. Rabat-tan',
      title: 'Director, Regional Office XI',
      address:
        'Unit 1 to 5, Ground Floor COPE Development Corporation Brgy 34-D , C.M Recto St., Davao City, 8000',
      phone: 'Tel No.: (082) 237-9275',
      fax: 'Fax: (082) 225 1940',
      email: 'dot11@tourism.gov.ph / dot11mpd@gmail.com'
    },
    {
      region: 'REGIONAL OFFICE XII (SOUTH CENTRAL MINDANAO REGION)',
      contact: 'Nelia R. Arina',
      title: 'Director, Regional Office XII',
      address:
        'Ground Floor Sanle Building, Benigno Aquino cor. Lapu-Lapu Street, Zone III, Koronadal,9506',
      phone: 'Tel. No.: (063) 520-1274',
      fax: 'Fax: (083) 228-8667',
      email: 'dot12@tourism.gov.ph / tourism@dot12.org'
    },
    {
      region: 'REGIONAL OFFICE XIII (CARAGA REGION)',
      contact: 'Ivonnie B. Dumadag',
      title: 'Director, Regional Office XIII',
      address: 'P-6, Barangay Villa Kananga, Butuan City',
      phone: 'Tel No.: (085) 817-2085',
      fax: 'Fax: (085) 815 6040',
      email: 'dot13@tourism.gov.ph / dot13@yahoo.com'
    }
  ];

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: '#6b7280', fontSize: 14 }}>Home &gt; Contact Us &gt; Local Regional Offices</div>
      <h1 style={{ fontSize: 34, marginTop: 8 }}>Offices Across the Nation</h1>

      <div className="contact-layout">
        <select
          className="contact-mobile-select"
          onChange={(e) => {
            const id = (e.target as HTMLSelectElement).value;
            if (!id) return;
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <option value="">Jump to region</option>
          {offices.map((o) => {
            const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return (
              <option key={id} value={id}>
                {o.region}
              </option>
            );
          })}
        </select>

        <aside className="contact-sidebar">
          <h4>Jump to region</h4>
          <ul>
            {offices.map((o) => {
              const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              return (
                <li key={id}>
                  <a href={`#${id}`}>{o.region}</a>
                </li>
              );
            })}
          </ul>
        </aside>

        <div>
          <div className="contact-content">
            {offices.map((o) => {
              const id = o.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              return (
                <div key={id} id={id} className="office-card">
                  <h3>{o.region}</h3>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{o.contact}</div>
                  <div className="contact-meta">{o.title}</div>
                  <div style={{ marginBottom: 8 }}>{o.address}</div>
                  {o.phone && <div style={{ marginBottom: 4 }}>{o.phone}</div>}
                  {o.tourist && <div style={{ marginBottom: 4 }}>{o.tourist}</div>}
                  {o.airport && <div style={{ marginBottom: 4 }}>{o.airport}</div>}
                  {o.fax && <div style={{ marginBottom: 4 }}>{o.fax}</div>}
                  {o.website && <div style={{ marginBottom: 4 }}>Website: {o.website}</div>}
                  <div style={{ marginTop: 8, color: 'var(--accent)' }}>E-Mail: {o.email}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

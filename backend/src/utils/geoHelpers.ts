/**
 * Convert between MongoDB GeoJSON Point format and frontend LatLng format.
 * 
 * MongoDB uses [longitude, latitude] in coordinates.
 * Frontend expects { latitude, longitude } for readability.
 */

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function geoPointToLatLng(point: GeoPoint | undefined): LatLng | undefined {
  if (!point || !point.coordinates || point.coordinates.length !== 2) {
    return undefined;
  }
  const [lng, lat] = point.coordinates;
  return { latitude: lat, longitude: lng };
}

export function latLngToGeoPoint(latLng: LatLng): GeoPoint {
  return {
    type: 'Point',
    coordinates: [latLng.longitude, latLng.latitude],
  };
}

export function serializeUser(doc: any) {
  return {
    id: String(doc._id),
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    barangay: doc.barangay,
    location: geoPointToLatLng(doc.homeLocation),
    alertRadiusMeters: doc.alertRadiusMeters,
    joinedAt: doc.joinedAt?.toISOString?.(),
    flaggedReportCount: doc.flaggedReportCount,
    isBanned: doc.isBanned,
  };
}

export function serializeShelter(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name,
    barangay: doc.barangay,
    address: doc.address,
    contactNumber: doc.contactNumber,
    email: doc.email,
    location: geoPointToLatLng(doc.location),
    operatingRadiusMeters: doc.operatingRadiusMeters,
    approvalStatus: doc.approvalStatus,
    registeredAt: doc.registeredAt?.toISOString?.(),
    permitNumber: doc.permitNumber,
    capacity: doc.capacity,
    currentOccupancy: doc.currentOccupancy,
    logoColor: doc.logoColor,
  };
}

export function serializeLostReport(doc: any) {
  const [lng, lat] = doc.lastSeenLocation?.coordinates || [0, 0];
  return {
    id: String(doc._id),
    kind: 'lost',
    name: doc.name,
    animalType: doc.animalType,
    breed: doc.breed,
    color: doc.color,
    sex: doc.sex,
    size: doc.size,
    distinctMarks: doc.distinctMarks,
    description: doc.description,
    imageUrls: doc.imageUrls || [],
    status: doc.status,
    reportedAt: doc.reportedAt?.toISOString?.(),
    reporterId: String(doc.reporterId),
    reporterName: doc.reporterName,
    reporterPhone: doc.reporterPhone,
    barangay: doc.barangay,
    location: { latitude: lat, longitude: lng },
    caseId: doc.caseId ? String(doc.caseId) : undefined,
    moderationFlagId: doc.moderationFlagId ? String(doc.moderationFlagId) : undefined,
  };
}

export function serializeFoundReport(doc: any) {
  const [lng, lat] = doc.foundLocation?.coordinates || [0, 0];
  return {
    id: String(doc._id),
    kind: 'found',
    animalType: doc.animalType,
    breed: doc.breed,
    color: doc.color,
    sex: doc.sex,
    size: doc.size,
    distinctMarks: doc.distinctMarks,
    description: doc.description,
    imageUrls: doc.imageUrls || [],
    status: doc.status,
    reportedAt: doc.reportedAt?.toISOString?.(),
    reporterId: String(doc.reporterId),
    reporterName: doc.reporterName,
    reporterPhone: doc.reporterPhone,
    barangay: doc.barangay,
    location: { latitude: lat, longitude: lng },
    caseId: doc.caseId ? String(doc.caseId) : undefined,
    moderationFlagId: doc.moderationFlagId ? String(doc.moderationFlagId) : undefined,
  };
}

export function serializeShelterAnimal(doc: any) {
  return {
    id: String(doc._id),
    shelterId: String(doc.shelterId),
    name: doc.name,
    animalType: doc.animalType,
    breed: doc.breed,
    color: doc.color,
    sex: doc.sex,
    size: doc.size,
    distinctMarks: doc.distinctMarks,
    imageUrls: doc.imageUrls || [],
    intakeType: doc.intakeType,
    intakeDate: doc.intakeDate?.toISOString?.(),
    caseStatus: doc.caseStatus,
    postedPublicly: doc.postedPublicly,
    notes: doc.notes,
  };
}

export function serializeMatchSuggestion(doc: any) {
  return {
    id: String(doc._id),
    lostReportId: String(doc.lostReportId),
    candidateId: String(doc.candidateId),
    candidateSource: doc.candidateSource,
    score: doc.score || doc.similarityScore || 0,
    reasons: doc.reasons || [],
    createdAt: doc.createdAt?.toISOString?.(),
  };
}

export function serializeNotification(doc: any) {
  const audienceMap: Record<string, string> = {
    user: 'user',
    shelter: 'shelter_admin',
  };
  
  const typeMap: Record<string, string> = {
    lost_report: 'lost_nearby',
    found_report: 'found_nearby',
    match: 'match_found',
    status_update: 'case_update',
    message: 'message',
  };

  return {
    id: String(doc._id),
    audience: audienceMap[doc.audienceType] || doc.audienceType,
    type: typeMap[doc.type] || doc.type,
    title: doc.title,
    body: doc.body,
    isRead: doc.isRead || false,
    createdAt: doc.createdAt?.toISOString?.(),
    distanceMeters: doc.distanceMeters,
    relatedReportId: doc.refId ? String(doc.refId) : undefined,
  };
}

package com.hospital.management.controller;

import com.hospital.management.entity.Appointment;
import com.hospital.management.entity.Patient;
import com.hospital.management.entity.Doctor;
import com.hospital.management.repository.AppointmentRepository;
import com.hospital.management.repository.PatientRepository;
import com.hospital.management.repository.DoctorRepository;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentController(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(
            @PathVariable Long id) {
        return appointmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createAppointment(
            @RequestBody Appointment appointment) {

        Long patientId = appointment.getPatient().getId();
        Long doctorId = appointment.getDoctor().getId();

        Patient patient = patientRepository.findById(patientId)
                .orElse(null);

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElse(null);

        if (patient == null || doctor == null) {
            return ResponseEntity.badRequest()
                    .body("Invalid patient ID or doctor ID");
        }

        appointment.setPatient(patient);
        appointment.setDoctor(doctor);

        return ResponseEntity.ok(
                appointmentRepository.save(appointment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAppointment(
            @PathVariable Long id,
            @RequestBody Appointment updatedAppointment) {

        return appointmentRepository.findById(id)
                .map(existing -> {
                    existing.setAppointmentDate(
                            updatedAppointment.getAppointmentDate());
                    existing.setStatus(updatedAppointment.getStatus());
                    existing.setReason(updatedAppointment.getReason());

                    return ResponseEntity.ok(
                            appointmentRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(
            @PathVariable Long id) {

        if (!appointmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        appointmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

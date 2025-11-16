import hashlib
import json
from typing import Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import secrets
import base64


class VotingCrypto:
    """
    Clase con métodos estáticos para operaciones criptográficas
    """
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Genera hash SHA-256 de una contraseña
        
        Args:
            password: Contraseña en texto plano
            
        Returns:
            Hash hexadecimal de 64 caracteres
        """
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    @staticmethod
    def verify_password(password: str, stored_hash: str) -> bool:
        """
        Verifica que el hash de la contraseña coincida
        
        Args:
            password: Contraseña a verificar
            stored_hash: Hash almacenado en la base de datos
            
        Returns:
            True si coinciden
        """
        return VotingCrypto.hash_password(password) == stored_hash
    
    @staticmethod
    def hash_vote(election_id: str, option_id: str, timestamp: str) -> str:
        """
        Genera hash del voto para garantizar integridad
        
        Args:
            election_id: ID de la elección
            option_id: ID de la opción votada
            timestamp: Timestamp del voto
            
        Returns:
            Hash SHA-256 hexadecimal
        """
        vote_string = f"{election_id}:{option_id}:{timestamp}"
        return hashlib.sha256(vote_string.encode('utf-8')).hexdigest()
    
    @staticmethod
    def hash_receipt(user_id: str, election_id: str, timestamp: str) -> str:
        """
        Genera hash del recibo de votación
        
        Args:
            user_id: ID del usuario
            election_id: ID de la elección
            timestamp: Timestamp del voto
            
        Returns:
            Hash SHA-256 hexadecimal
        """
        receipt_string = f"{user_id}:{election_id}:{timestamp}"
        return hashlib.sha256(receipt_string.encode('utf-8')).hexdigest()
    
    @staticmethod
    def sign_data(data: str, private_key) -> str:
        """
        Firma datos con una clave privada RSA (para no repudio)
        
        Args:
            data: Datos a firmar
            private_key: Clave privada RSA
            
        Returns:
            Firma en base64
        """
        signature = private_key.sign(
            data.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode('utf-8')
    
    @staticmethod
    def verify_signature(data: str, signature: str, public_key) -> bool:
        """
        Verifica la firma digital de datos
        
        Args:
            data: Datos originales
            signature: Firma en base64
            public_key: Clave pública RSA
            
        Returns:
            True si la firma es válida
        """
        try:
            signature_bytes = base64.b64decode(signature)
            public_key.verify(
                signature_bytes,
                data.encode('utf-8'),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False
    
    @staticmethod
    def encrypt_vote(vote_data: dict, key: Optional[bytes] = None) -> Tuple[str, str]:
        """
        Cifra el voto usando AES-256-GCM para confidencialidad
        
        Args:
            vote_data: Diccionario con datos del voto
            key: Clave de cifrado (se genera si no se proporciona)
            
        Returns:
            Tupla (voto_cifrado_base64, clave_base64)
        """
        # Generar clave si no se proporciona
        if key is None:
            key = secrets.token_bytes(32)  # 256 bits
        
        # Generar IV (vector de inicialización)
        iv = secrets.token_bytes(12)  # 96 bits para GCM
        
        # Convertir vote_data a JSON
        vote_json = json.dumps(vote_data, sort_keys=True)
        
        # Crear cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # Cifrar
        ciphertext = encryptor.update(vote_json.encode('utf-8')) + encryptor.finalize()
        
        # Combinar IV + Tag + Ciphertext
        encrypted_data = iv + encryptor.tag + ciphertext
        
        return (
            base64.b64encode(encrypted_data).decode('utf-8'),
            base64.b64encode(key).decode('utf-8')
        )
    
    @staticmethod
    def decrypt_vote(encrypted_vote: str, key: str) -> dict:
        """
        Descifra el voto usando AES-256-GCM
        
        Args:
            encrypted_vote: Voto cifrado en base64
            key: Clave de cifrado en base64
            
        Returns:
            Diccionario con datos del voto
        """
        # Decodificar
        encrypted_data = base64.b64decode(encrypted_vote)
        key_bytes = base64.b64decode(key)
        
        # Extraer componentes
        iv = encrypted_data[:12]
        tag = encrypted_data[12:28]
        ciphertext = encrypted_data[28:]
        
        # Crear cipher
        cipher = Cipher(
            algorithms.AES(key_bytes),
            modes.GCM(iv, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Descifrar
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Convertir de JSON a dict
        return json.loads(plaintext.decode('utf-8'))
    
    @staticmethod
    def generate_token() -> str:
        """
        Genera un token aleatorio seguro
        
        Returns:
            Token hexadecimal de 32 bytes
        """
        return secrets.token_hex(32)
    
    @staticmethod
    def load_private_key_from_pem(pem_data: str):
        """
        Carga una clave privada RSA desde formato PEM
        
        Args:
            pem_data: Clave privada en formato PEM
            
        Returns:
            Objeto RSAPrivateKey
        """
        return serialization.load_pem_private_key(
            pem_data.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
    
    @staticmethod
    def load_public_key_from_pem(pem_data: str):
        """
        Carga una clave pública RSA desde formato PEM
        
        Args:
            pem_data: Clave pública en formato PEM
            
        Returns:
            Objeto RSAPublicKey
        """
        return serialization.load_pem_public_key(
            pem_data.encode('utf-8'),
            backend=default_backend()
        )